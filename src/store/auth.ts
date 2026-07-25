import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { cancelScheduledProgressPush } from '../lib/progressSync';

export interface AuthActionResult {
  error: string | null;
  message?: string;
  requiresEmailConfirmation?: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  displayName: string | null;
  /** Effective permission only: unresolved/error states are always false. */
  isAdmin: boolean;
  /** Increments before every async user/profile/role resolution. */
  authGeneration: number;
  isPasswordRecovery: boolean;
  isReady: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<AuthActionResult>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
}

function cleanDisplayName(value: string): string {
  return value.trim().slice(0, 50);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('email not confirmed')
  ) {
    return 'Email hoặc mật khẩu chưa đúng, hoặc em chưa xác nhận email.';
  }

  if (normalized.includes('user already registered')) {
    return 'Email này đã được đăng ký. Em hãy đăng nhập hoặc đặt lại mật khẩu.';
  }

  if (normalized.includes('password')) {
    return 'Mật khẩu chưa hợp lệ. Em hãy dùng ít nhất 8 ký tự.';
  }

  return 'Có lỗi xảy ra trong quá trình xử lý. Em hãy thử lại sau nhé.';
}

function detectPasswordRecoveryFromUrl(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.location.hash.includes('type=recovery') ||
    window.location.search.includes('type=recovery')
  );
}

function getAuthRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${window.location.origin}${import.meta.env.BASE_URL}auth`;
}

function readUserDisplayName(user: User): string | null {
  const metadata = user.user_metadata;

  if (isRecord(metadata) && typeof metadata.display_name === 'string') {
    return cleanDisplayName(metadata.display_name);
  }

  return user.email ?? null;
}

async function resolveDisplayName(user: User): Promise<string | null> {
  const fallback = readUserDisplayName(user);

  if (!supabase) {
    return fallback ?? null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    if (!isRecord(data) || typeof data.display_name !== 'string' || error) {
      return fallback ?? null;
    }

    return cleanDisplayName(data.display_name);
  } catch {
    return fallback ?? null;
  }
}

const ADMIN_LOOKUP_TIMEOUT_MS = 8_000;

async function resolveIsAdmin(user: User): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeout = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), ADMIN_LOOKUP_TIMEOUT_MS);
    });
    const request = Promise.resolve(
      supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
    ).catch(() => null);
    const result = await Promise.race([request, timeout]);

    return Boolean(
      result &&
        !result.error &&
        isRecord(result.data) &&
        typeof result.data.user_id === 'string' &&
        result.data.user_id === user.id
    );
  } catch {
    return false;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

let initializePromise: Promise<void> | null = null;
let unsubscribeAuth: {
  unsubscribe: () => void;
} | null = null;
let authGeneration = 0;

async function applySession(
  set: (partial: Partial<AuthState>) => void,
  session: Session | null,
  event: string
): Promise<void> {
  const user = session?.user ?? null;
  const generation = ++authGeneration;

  // Reset before awaiting either request. This makes the effective permission
  // fail closed during startup, refresh, logout and account switches.
  set({
    session,
    user,
    displayName: null,
    isAdmin: false,
    authGeneration: generation,
    isPasswordRecovery: event === 'PASSWORD_RECOVERY',
    isReady: true
  });

  if (!user) {
    return;
  }

  const [displayName, isAdmin] = await Promise.all([
    resolveDisplayName(user),
    resolveIsAdmin(user)
  ]);

  // A profile/role result must never revive an older account after an auth
  // event has moved the session forward.
  const current = useAuthStore.getState();
  if (current.authGeneration !== generation || current.user?.id !== user.id) {
    return;
  }

  set({ displayName, isAdmin });
}

function invalidateAdminState(set: (partial: Partial<AuthState>) => void) {
  const generation = ++authGeneration;
  set({ isAdmin: false, authGeneration: generation });
}

async function applyUserUpdate(
  set: (partial: Partial<AuthState>) => void,
  user: User | null
): Promise<void> {
  const generation = ++authGeneration;
  set({
    user,
    displayName: null,
    isAdmin: false,
    authGeneration: generation,
    isPasswordRecovery: false
  });

  if (!user) {
    return;
  }

  const [displayName, isAdmin] = await Promise.all([
    resolveDisplayName(user),
    resolveIsAdmin(user)
  ]);
  const current = useAuthStore.getState();
  if (current.authGeneration !== generation || current.user?.id !== user.id) {
    return;
  }
  set({ displayName, isAdmin });
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  displayName: null,
  isAdmin: false,
  authGeneration: 0,
  isPasswordRecovery: detectPasswordRecoveryFromUrl(),
  isReady: false,
  isLoading: false,
  isConfigured: supabase !== null,
  async initialize() {
    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      if (!supabase) {
        invalidateAdminState(set);
        set({ isReady: true });
        return;
      }

      if (!unsubscribeAuth) {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            // Sign-out từ tab khác/session bị thu hồi cũng phải huỷ timer
            // push đang chờ, nếu không snapshot cũ vẫn được đẩy sau logout.
            cancelScheduledProgressPush();
          }

          void applySession(set, session, event);
        });

        unsubscribeAuth = data.subscription;
      }

      const { data, error } = await supabase.auth.getSession();
      await applySession(set, data.session, 'INITIAL_SESSION');
      set({ isPasswordRecovery: detectPasswordRecoveryFromUrl() });

      if (error) {
        throw error;
      }
    })().catch(() => {
      invalidateAdminState(set);
      set({ isReady: true });
    });

    return initializePromise;
  },
  async signUp(email, password, displayName) {
    if (!supabase) {
      return {
        error:
          'Ứng dụng chưa được cấu hình Supabase nên chỉ lưu tiến độ cục bộ.'
      };
    }

    const trimmedEmail = email.trim();
    const trimmedName = cleanDisplayName(displayName);

    if (!trimmedName) {
      return { error: 'Em hãy nhập tên hiển thị.' };
    }

    if (password.length < 8) {
      return { error: 'Mật khẩu phải có ít nhất 8 ký tự.' };
    }

    set({ isLoading: true });

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          display_name: trimmedName
        },
        emailRedirectTo: getAuthRedirectUrl()
      }
    });

    set({ isLoading: false });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    if (data.session) {
      await applySession(set, data.session, 'SIGNED_IN');
    }

    return {
      error: null,
      message: data.session
        ? 'Tài khoản đã được tạo và đăng nhập thành công.'
        : 'Tài khoản đã được tạo. Em hãy mở email để xác nhận rồi đăng nhập.',
      requiresEmailConfirmation: data.session === null
    };
  },
  async signIn(email, password) {
    if (!supabase) {
      return {
        error:
          'Ứng dụng chưa được cấu hình Supabase nên chỉ lưu tiến độ cục bộ.'
      };
    }

    set({ isLoading: true });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    set({ isLoading: false });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    await applySession(set, data.session, 'SIGNED_IN');

    return {
      error: null,
      message: 'Đăng nhập thành công.'
    };
  },
  async signOut() {
    if (!supabase) {
      cancelScheduledProgressPush();
      invalidateAdminState(set);
      set({
        session: null,
        user: null,
        displayName: null,
        isAdmin: false,
        isPasswordRecovery: false
      });

      return { error: null };
    }

    // Huỷ timer TRƯỚC khi await: mạng chậm quá 2 giây sẽ để timer kịp
    // push snapshot giữa lúc đang đăng xuất.
    cancelScheduledProgressPush();
    invalidateAdminState(set);
    set({ isLoading: true });
    const { error } = await supabase.auth.signOut();
    set({ isLoading: false });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    await applySession(set, null, 'SIGNED_OUT');

    return { error: null, message: 'Đã đăng xuất.' };
  },
  async resetPassword(email) {
    if (!supabase) {
      return {
        error:
          'Ứng dụng chưa được cấu hình Supabase nên chưa thể gửi email đặt lại mật khẩu.'
      };
    }

    set({ isLoading: true });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthRedirectUrl()
    });
    set({ isLoading: false });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    return {
      error: null,
      message: 'Email đặt lại mật khẩu đã được gửi nếu địa chỉ này tồn tại.'
    };
  },
  async updatePassword(newPassword) {
    if (!supabase) {
      return {
        error:
          'Ứng dụng chưa được cấu hình Supabase nên chưa thể cập nhật mật khẩu.'
      };
    }

    if (newPassword.length < 8) {
      return { error: 'Mật khẩu phải có ít nhất 8 ký tự.' };
    }

    set({ isLoading: true });
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    set({ isLoading: false });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    const user = data.user ?? null;
    const session = getAuthStore().getState().session;
    if (user && session) {
      await applySession(set, { ...session, user }, 'USER_UPDATED');
    } else {
      await applyUserUpdate(set, user);
    }

    return {
      error: null,
      message: 'Mật khẩu mới đã được lưu.'
    };
  }
}));

export function resetAuthStoreForTests() {
  initializePromise = null;
  authGeneration = 0;
  unsubscribeAuth?.unsubscribe();
  unsubscribeAuth = null;
  useAuthStore.setState({
    session: null,
    user: null,
    displayName: null,
    isAdmin: false,
    authGeneration: 0,
    isPasswordRecovery: false,
    isReady: false,
    isLoading: false,
    isConfigured: supabase !== null
  });
}

export function getAuthStore() {
  return useAuthStore;
}
