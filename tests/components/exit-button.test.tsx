import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExitButton } from '../../src/components/ExitButton';

describe('ExitButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('xác nhận rồi điều hướng về trang chủ', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/session']}>
        <Routes>
          <Route
            element={
              <ExitButton confirmMessage="Thoát phiên hiện tại để về lộ trình?" />
            }
            path="/session"
          />
          <Route element={<div>Trang chủ</div>} path="/" />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '✕ Thoát' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      'Thoát phiên hiện tại để về lộ trình?'
    );
    expect(screen.getByText('Trang chủ')).toBeInTheDocument();
  });

  it('huỷ xác nhận thì ở lại màn hình hiện tại', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/session']}>
        <Routes>
          <Route
            element={<ExitButton confirmMessage="Không thoát" />}
            path="/session"
          />
          <Route element={<div>Trang chủ</div>} path="/" />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '✕ Thoát' }));

    expect(confirmSpy).toHaveBeenCalledWith('Không thoát');
    expect(screen.getByRole('button', { name: '✕ Thoát' })).toBeInTheDocument();
    expect(screen.queryByText('Trang chủ')).not.toBeInTheDocument();
  });
});
