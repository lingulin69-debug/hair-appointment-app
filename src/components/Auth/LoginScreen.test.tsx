import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginScreen } from './LoginScreen';

afterEach(() => {
  cleanup();
});

describe('LoginScreen', () => {
  it('keeps the login layout vertically scrollable on small screens', () => {
    render(<LoginScreen onSubmit={vi.fn()} />);

    expect(screen.getByTestId('login-screen-shell')).toHaveClass('overflow-y-auto');
    expect(screen.getByTestId('login-screen-shell')).toHaveClass('h-[100dvh]');
    expect(screen.getByTestId('login-screen-layout')).toHaveClass('justify-start');
    expect(screen.getByTestId('login-screen-layout')).toHaveClass('lg:justify-center');
  });

  it('keeps submit disabled until email and password are filled', () => {
    render(<LoginScreen onSubmit={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: '進入系統' });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('alassealin 或 owner@amysalon.local'), {
      target: { value: 'alassealin' },
    });
    fireEvent.change(screen.getByPlaceholderText('輸入密碼'), {
      target: { value: 'secret-pass' },
    });

    expect(submitButton).not.toBeDisabled();
  });

  it('submits identifier, password, and remember flag to the handler', async () => {
    const onSubmit = vi.fn();
    render(<LoginScreen onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('alassealin 或 owner@amysalon.local'), {
      target: { value: 'alassealin' },
    });
    fireEvent.change(screen.getByPlaceholderText('輸入密碼'), {
      target: { value: 'secret-pass' },
    });
    fireEvent.click(screen.getByLabelText('記住這台裝置的帳號密碼'));
    fireEvent.click(screen.getByRole('button', { name: '進入系統' }));

    expect(onSubmit).toHaveBeenCalledWith('alassealin', 'secret-pass', true);
  });

  it('prefills remembered credentials when provided', () => {
    render(
      <LoginScreen
        defaultIdentifier="alassealin"
        defaultPassword="secret-pass"
        defaultRememberDevice
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('alassealin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('secret-pass')).toBeInTheDocument();
    expect(screen.getByLabelText('記住這台裝置的帳號密碼')).toBeChecked();
  });
});