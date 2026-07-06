import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuthListener = (
  event:
    | 'PASSWORD_RECOVERY'
    | 'SIGNED_IN'
    | 'SIGNED_OUT'
    | 'TOKEN_REFRESHED'
    | 'USER_UPDATED',
  session: {
    access_token: string;
    refresh_token: string | null;
    expires_at: number | null;
    expires_in: number | null;
    token_type: string;
    user: {
      id: string;
      email: string | null;
      user_metadata: Record<string, unknown>;
    };
  } | null
) => void | Promise<void>;

const {
  signUp,
  signInWithPassword,
  signOut,
  resetPasswordForEmail,
  updateUser,
  getSession,
  profileMaybeSingle,
  getAuthListener,
  resetAuthListener,
  mockSupabase
} = vi.hoisted(() => {
  let authListener: AuthListener | null = null;
  const signUp = vi.fn();
  const signInWithPassword = vi.fn();
  const signOut = vi.fn();
  const resetPasswordForEmail = vi.fn();
  const updateUser = vi.fn();
  const getSession = vi.fn();
  const profileMaybeSingle = vi.fn();

  return {
    signUp,
    signInWithPassword,
    signOut,
    resetPasswordForEmail,
    updateUser,
    getSession,
    profileMaybeSingle,
    getAuthListener: () => authListener,
    resetAuthListener: () => {
      authListener = null;
    },
    mockSupabase: {
      auth: {
        getSession,
        onAuthStateChange: vi.fn((callback: AuthListener) => {
          authListener = callback;
          return {
            data: {
              subscription: {
                unsubscribe: vi.fn()
              }
            }
          };
        }),
        resetPasswordForEmail,
        signInWithPassword,
        signOut,
        signUp,
        updateUser
      },
      from: vi.fn((table: string) => {
        if (table !== 'profiles') {
          throw new Error(`Unexpected table: ${table}`);
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: profileMaybeSingle
            }))
          })),
          upsert: vi.fn()
        };
      })
    }
  };
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: mockSupabase
}));

import { getAuthStore, resetAuthStoreForTests } from '../../src/store/auth';

function createSession(displayName = 'Lan Anh') {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3_600,
    expires_in: 3_600,
    token_type: 'bearer',
    user: {
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-07-05T00:00:00.000Z',
      id: 'user-1',
      email: 'lan.anh@example.com',
      user_metadata: {
        display_name: displayName
      }
    }
  };
}

describe('auth store', () => {
  beforeEach(() => {
    resetAuthListener();
    signUp.mockReset();
    signInWithPassword.mockReset();
    signOut.mockReset();
    resetPasswordForEmail.mockReset();
    updateUser.mockReset();
    getSession.mockReset();
    profileMaybeSingle.mockReset();
    resetAuthStoreForTests();
  });

  it('initialize lấy session hiện tại và lắng nghe onAuthStateChange', async () => {
    getSession.mockResolvedValue({
      data: {
        session: createSession('Tên trên profile')
      },
      error: null
    });
    profileMaybeSingle.mockResolvedValue({
      data: { display_name: 'Tên trên profile' },
      error: null
    });

    await getAuthStore().getState().initialize();

    expect(getAuthStore().getState().isReady).toBe(true);
    expect(getAuthStore().getState().displayName).toBe('Tên trên profile');
    expect(getAuthListener()).not.toBeNull();

    await getAuthListener()?.('SIGNED_OUT', null);
    expect(getAuthStore().getState().user).toBeNull();
  });

  it('signUp báo lỗi khi mật khẩu ngắn hơn 8 ký tự', async () => {
    await expect(
      getAuthStore().getState().signUp('abc@example.com', '1234567', 'Mai')
    ).resolves.toEqual({
      error: 'Mật khẩu phải có ít nhất 8 ký tự.'
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it('signUp trả về trạng thái chờ xác nhận email', async () => {
    signUp.mockResolvedValue({
      data: {
        session: null,
        user: {
          id: 'user-2',
          email: 'hoc.sinh@example.com',
          user_metadata: {
            display_name: 'Học Sinh'
          }
        }
      },
      error: null
    });
    profileMaybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    const result = await getAuthStore()
      .getState()
      .signUp('hoc.sinh@example.com', '12345678', 'Học Sinh');

    expect(result.error).toBeNull();
    expect(result.requiresEmailConfirmation).toBe(true);
    expect(getAuthStore().getState().user).toBeNull();
  });

  it('signIn và signOut cập nhật session trong store', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        session: createSession('Minh'),
        user: createSession('Minh').user
      },
      error: null
    });
    profileMaybeSingle.mockResolvedValue({
      data: { display_name: 'Minh' },
      error: null
    });
    signOut.mockResolvedValue({
      data: null,
      error: null
    });

    const signInResult = await getAuthStore()
      .getState()
      .signIn('lan.anh@example.com', '12345678');

    expect(signInResult.error).toBeNull();
    expect(getAuthStore().getState().user?.email).toBe('lan.anh@example.com');
    expect(getAuthStore().getState().displayName).toBe('Minh');

    const signOutResult = await getAuthStore().getState().signOut();

    expect(signOutResult.error).toBeNull();
    expect(getAuthStore().getState().user).toBeNull();
  });

  it('resetPassword trả lỗi mạng đã dịch', async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: new Error('Không thể kết nối tới Supabase.') as Error & {
        status?: number;
      }
    });

    await expect(
      getAuthStore().getState().resetPassword('lan.anh@example.com')
    ).resolves.toEqual({
      error: 'Có lỗi xảy ra trong quá trình xử lý. Em hãy thử lại sau nhé.'
    });
  });

  it('updatePassword báo lỗi khi mật khẩu mới ngắn hơn 8 ký tự', async () => {
    await expect(
      getAuthStore().getState().updatePassword('1234567')
    ).resolves.toEqual({
      error: 'Mật khẩu phải có ít nhất 8 ký tự.'
    });

    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updatePassword lưu mật khẩu mới và thoát recovery mode', async () => {
    getAuthStore().setState({
      isPasswordRecovery: true,
      user: createSession('Lan Anh').user
    });
    updateUser.mockResolvedValue({
      data: {
        user: createSession('Lan Anh Mới').user
      },
      error: null
    });
    profileMaybeSingle.mockResolvedValue({
      data: { display_name: 'Lan Anh Mới' },
      error: null
    });

    const result = await getAuthStore().getState().updatePassword('12345678');

    expect(updateUser).toHaveBeenCalledWith({
      password: '12345678'
    });
    expect(result).toEqual({
      error: null,
      message: 'Mật khẩu mới đã được lưu.'
    });
    expect(getAuthStore().getState().isPasswordRecovery).toBe(false);
    expect(getAuthStore().getState().displayName).toBe('Lan Anh Mới');
  });
});
