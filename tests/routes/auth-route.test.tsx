import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRoute } from '../../src/routes/AuthRoute';
import {
  type AuthActionResult,
  getAuthStore,
  resetAuthStoreForTests
} from '../../src/store/auth';

const signIn = vi.fn(() =>
  Promise.resolve<AuthActionResult>({
    error: null
  })
);
const signUp = vi.fn(() =>
  Promise.resolve<AuthActionResult>({
    error: null,
    requiresEmailConfirmation: false
  })
);
const resetPassword = vi.fn(() =>
  Promise.resolve<AuthActionResult>({
    error: null
  })
);
const updatePassword = vi.fn(() =>
  Promise.resolve<AuthActionResult>({
    error: null
  })
);

function createSession(): Session {
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
      email: 'hoc.sinh@example.com',
      user_metadata: {
        display_name: 'Học Sinh'
      }
    }
  } as Session;
}

function renderAuthRoute(initialEntries = ['/auth']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/profile" element={<div>Trang hồ sơ</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function getFormForControl(label: RegExp | string) {
  const form = screen.getByLabelText(label).closest('form');

  if (!(form instanceof HTMLFormElement)) {
    throw new Error(`Expected ${label} input to be inside a form`);
  }

  return form;
}

function getPasswordInput() {
  return screen.getByLabelText(/^Mật khẩu/);
}

describe('AuthRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAuthStoreForTests();
    signIn.mockReset();
    signUp.mockReset();
    resetPassword.mockReset();
    updatePassword.mockReset();

    signIn.mockResolvedValue({ error: null, message: 'Đăng nhập thành công.' });
    signUp.mockResolvedValue({
      error: null,
      message: 'Tài khoản đã được tạo và đăng nhập thành công.',
      requiresEmailConfirmation: false
    });
    resetPassword.mockResolvedValue({
      error: null,
      message: 'Email đặt lại mật khẩu đã được gửi nếu địa chỉ này tồn tại.'
    });
    updatePassword.mockResolvedValue({
      error: null,
      message: 'Mật khẩu mới đã được lưu.'
    });

    getAuthStore().setState({
      isConfigured: true,
      isLoading: false,
      isPasswordRecovery: false,
      session: null,
      signIn,
      signUp,
      resetPassword,
      updatePassword
    });
  });

  it('mặc định ở chế độ đăng nhập, gọi signIn và điều hướng sang hồ sơ khi thành công', async () => {
    const user = userEvent.setup();

    renderAuthRoute();

    expect(
      screen.getByRole('heading', { name: 'Đăng nhập' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(screen.queryByLabelText('Tên hiển thị')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'hoc.sinh@example.com');
    await user.type(getPasswordInput(), '12345678');
    await user.click(
      within(getFormForControl('Email')).getByRole('button', {
        name: 'Đăng nhập'
      })
    );

    expect(signIn).toHaveBeenCalledWith('hoc.sinh@example.com', '12345678');
    expect(await screen.findByText('Trang hồ sơ')).toBeInTheDocument();
  });

  it('hiển thị lỗi signIn cho người dùng', async () => {
    const user = userEvent.setup();

    signIn.mockResolvedValue({
      error: 'Email hoặc mật khẩu chưa đúng, hoặc em chưa xác nhận email.'
    });

    renderAuthRoute();

    await user.type(screen.getByLabelText('Email'), 'hoc.sinh@example.com');
    await user.type(getPasswordInput(), '12345678');
    await user.click(
      within(getFormForControl('Email')).getByRole('button', {
        name: 'Đăng nhập'
      })
    );

    expect(signIn).toHaveBeenCalledWith('hoc.sinh@example.com', '12345678');
    expect(
      await screen.findByText(
        'Email hoặc mật khẩu chưa đúng, hoặc em chưa xác nhận email.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Trang hồ sơ')).not.toBeInTheDocument();
  });

  it('chế độ tạo tài khoản gọi signUp và giữ nguyên trang khi cần xác nhận email', async () => {
    const user = userEvent.setup();

    signUp.mockResolvedValue({
      error: null,
      message:
        'Tài khoản đã được tạo. Em hãy mở email để xác nhận rồi đăng nhập.',
      requiresEmailConfirmation: true
    });

    renderAuthRoute();

    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(screen.getByLabelText('Tên hiển thị')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Tên hiển thị'), 'Lan Anh');
    await user.type(screen.getByLabelText('Email'), 'lan.anh@example.com');
    await user.type(getPasswordInput(), '12345678');
    await user.click(
      within(getFormForControl('Tên hiển thị')).getByRole('button', {
        name: 'Tạo tài khoản'
      })
    );

    expect(signUp).toHaveBeenCalledWith(
      'lan.anh@example.com',
      '12345678',
      'Lan Anh'
    );
    expect(
      await screen.findByText(
        'Tài khoản đã được tạo. Em hãy mở email để xác nhận rồi đăng nhập.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Tạo tài khoản' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Trang hồ sơ')).not.toBeInTheDocument();
  });

  it('điều hướng sang hồ sơ sau khi tạo tài khoản nếu không cần xác nhận email', async () => {
    const user = userEvent.setup();

    renderAuthRoute();

    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await user.type(screen.getByLabelText('Tên hiển thị'), 'Minh');
    await user.type(screen.getByLabelText('Email'), 'minh@example.com');
    await user.type(getPasswordInput(), '12345678');
    await user.click(
      within(getFormForControl('Tên hiển thị')).getByRole('button', {
        name: 'Tạo tài khoản'
      })
    );

    expect(signUp).toHaveBeenCalledWith('minh@example.com', '12345678', 'Minh');
    expect(await screen.findByText('Trang hồ sơ')).toBeInTheDocument();
  });

  it('chế độ quên mật khẩu ẩn trường mật khẩu, gọi resetPassword và hiển thị thông báo', async () => {
    const user = userEvent.setup();

    renderAuthRoute();

    await user.click(screen.getByRole('button', { name: 'Quên mật khẩu' }));

    expect(
      screen.getByRole('heading', { name: 'Quên mật khẩu' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Mật khẩu/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'lan.anh@example.com');
    await user.click(
      within(getFormForControl('Email')).getByRole('button', {
        name: 'Quên mật khẩu'
      })
    );

    expect(resetPassword).toHaveBeenCalledWith('lan.anh@example.com');
    expect(
      await screen.findByText(
        'Email đặt lại mật khẩu đã được gửi nếu địa chỉ này tồn tại.'
      )
    ).toBeInTheDocument();
  });

  it('khi ở password recovery mode thì hiển thị form nhập mật khẩu mới và điều hướng khi cập nhật thành công', async () => {
    const user = userEvent.setup();

    getAuthStore().setState({
      isPasswordRecovery: true
    });

    renderAuthRoute();

    expect(
      screen.getByRole('heading', { name: 'Nhập mật khẩu mới' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Đăng nhập' })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();

    await user.type(getPasswordInput(), '87654321');
    await user.click(
      within(getFormForControl(/^Mật khẩu/)).getByRole('button', {
        name: 'Lưu mật khẩu mới'
      })
    );

    expect(updatePassword).toHaveBeenCalledWith('87654321');
    expect(await screen.findByText('Trang hồ sơ')).toBeInTheDocument();
  });

  it('khi đã có session và không ở recovery mode thì hiện panel đã đăng nhập', () => {
    getAuthStore().setState({
      session: createSession()
    });

    renderAuthRoute();

    expect(screen.getByText('Em đã đăng nhập rồi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở hồ sơ' })).toHaveAttribute(
      'href',
      '/profile'
    );
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Tạo tài khoản' })
    ).not.toBeInTheDocument();
  });
});
