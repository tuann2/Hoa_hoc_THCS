import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthActionResult {
  error: string | null;
  message?: string;
  requiresEmailConfirmation?: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  displayName: string | null;
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

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!isRecord(data) || typeof data.display_name !== 'string' || error) {
    return fallback ?? null;
  }

  return cleanDisplayName(data.display_name);
}

let initializePromise: Promise<void> | null = null;
let unsubscribeAuth: {
  unsubscribe: () => void;
} | null = null;

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  displayName: null,
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
        set({ isReady: true });
        return;
      }

      if (!unsubscribeAuth) {
        const { data } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            const user = session?.user ?? null;
            const displayName = user ? await resolveDisplayName(user) : null;

            set((state) => ({
              ...state,
              session,
              user,
              displayName,
              isPasswordRecovery:
                event === 'PASSWORD_RECOVERY'
                  ? true
                  : event === 'SIGNED_OUT' || event === 'USER_UPDATED'
                    ? false
                    : state.isPasswordRecovery
            }));
          }
        );

        unsubscribeAuth = data.subscription;
      }

      const { data, error } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      const displayName = user ? await resolveDisplayName(user) : null;

      set({
        session: data.session,
        user,
        displayName,
        isPasswordRecovery: detectPasswordRecoveryFromUrl(),
        isReady: true
      });

      if (error) {
        throw error;
      }
    })().catch(() => {
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

    const user = data.session?.user ?? data.user;
    const nextDisplayName = user ? await resolveDisplayName(user) : trimmedName;

    if (data.session && user) {
      set({
        session: data.session,
        user,
        displayName: nextDisplayName,
        isPasswordRecovery: false
      });
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

    const user = data.session?.user ?? data.user;
    const displayName = user ? await resolveDisplayName(user) : null;

    set({
      session: data.session,
      user,
      displayName,
      isPasswordRecovery: false
    });

    return {
      error: null,
      message: 'Đăng nhập thành công.'
    };
  },
  async signOut() {
    if (!supabase) {
      set({
        session: null,
        user: null,
        displayName: null,
        isPasswordRecovery: false
      });

      return { error: null };
    }

    set({ isLoading: true });
    const { error } = await supabase.auth.signOut();
    set({ isLoading: false });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    set({
      session: null,
      user: null,
      displayName: null,
      isPasswordRecovery: false
    });

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
    const user = data.user ?? null;
    const displayName = user ? await resolveDisplayName(user) : null;
    set({ isLoading: false });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    set((state) => ({
      ...state,
      user,
      displayName,
      isPasswordRecovery: false
    }));

    return {
      error: null,
      message: 'Mật khẩu mới đã được lưu.'
    };
  }
}));

export function resetAuthStoreForTests() {
  initializePromise = null;
  unsubscribeAuth?.unsubscribe();
  unsubscribeAuth = null;
  useAuthStore.setState({
    session: null,
    user: null,
    displayName: null,
    isPasswordRecovery: false,
    isReady: false,
    isLoading: false,
    isConfigured: supabase !== null
  });
}

export function getAuthStore() {
  return useAuthStore;
}
