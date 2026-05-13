import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

afterEach(() => {
  cleanup();
});

function renderNavbar(
  overrides: Partial<React.ComponentProps<typeof Navbar>> = {}
) {
  const onModeChange = vi.fn();
  const onViewChange = vi.fn();

  render(
    <Navbar
      currentMode="frontdesk"
      currentView="calendar"
      onModeChange={onModeChange}
      onViewChange={onViewChange}
      onCalcOpen={vi.fn()}
      syncStatus="online"
      onSyncNow={vi.fn()}
      {...overrides}
    />
  );

  return { onModeChange, onViewChange };
}

describe('Navbar', () => {
  it('shows only frontdesk tabs in frontdesk mode', () => {
    renderNavbar();

    expect(screen.getByText('日曆排程')).toBeInTheDocument();
    expect(screen.queryByText('顧客目錄')).not.toBeInTheDocument();
  });

  it('shows backoffice tabs when backoffice mode is active', () => {
    renderNavbar({ currentMode: 'backoffice', currentView: 'clients' });

    expect(screen.getByText('顧客目錄')).toBeInTheDocument();
    expect(screen.getByText('服務與商品')).toBeInTheDocument();
    expect(screen.getByText('預約統計')).toBeInTheDocument();
    expect(screen.queryByText('日曆排程')).not.toBeInTheDocument();
  });

  it('calls mode change when switching to backoffice', () => {
    const { onModeChange } = renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: '後台管理 顧客、商品與報表' }));

    expect(onModeChange).toHaveBeenCalledWith('backoffice');
  });
});