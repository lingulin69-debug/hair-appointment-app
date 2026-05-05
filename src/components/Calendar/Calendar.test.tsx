import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from './Calendar';
import type { Appointment, StoreItem } from '../../types';

const appointments: Appointment[] = [
  {
    id: 'appt-1',
    clientId: 'client-1',
    clientName: 'Alice',
    phone: '0912345678',
    time: '10:00',
    service: '洗剪',
    pax: 1,
    notes: '',
    dateStr: '2099-03-29',
    totalPrice: 1200,
    status: 'pending',
    rescheduleCount: 0,
  },
];

const storeItems: StoreItem[] = [
  {
    id: 'service-1',
    name: '洗剪',
    price: 1200,
    duration: '30',
    type: 'service',
  },
];

describe('Calendar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('shows a full-day slot table after clicking a date', () => {
    render(
      <Calendar
        currentDate={new Date('2099-03-01T00:00:00')}
        appointments={appointments}
        storeItems={storeItems}
        leaveSet={new Set<string>()}
        onAddAppt={vi.fn()}
        onSelectAppt={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: '29' })[0]);

    expect(screen.getByText('當日時段表')).toBeInTheDocument();
    expect(screen.getByText('2099-03-29')).toBeInTheDocument();
    expect(screen.queryByText('全日時段')).not.toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(65);
    expect(within(table).getByText('Alice')).toBeInTheDocument();
    expect(within(table).getByText('已預約')).toBeInTheDocument();
    expect(within(table).getAllByText('空檔').length).toBeGreaterThan(0);
  });

  it('switches to the multi-day schedule view without removing the month calendar mode', () => {
    render(
      <Calendar
        currentDate={new Date('2099-03-01T00:00:00')}
        appointments={appointments}
        storeItems={storeItems}
        leaveSet={new Set<string>()}
        onAddAppt={vi.fn()}
        onSelectAppt={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: '多日排程' })[0]);

    expect(
      screen.getByText(/整月可左右拖動日期、上下瀏覽 08:00-24:00 時段。空白格就是可安排空檔。/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('日期跳轉')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '2099-03-29 10:00 Alice 洗剪' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '2099-03-29 10:00 Alice 洗剪' })
    ).toHaveStyle({ height: '68px' });
    expect(screen.queryByText('時間')).not.toBeInTheDocument();
    expect(screen.queryByText('10:00-10:30')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '月曆' }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '日期跳轉' }));

    expect(screen.getByRole('dialog', { name: '日期跳轉選單' })).toBeInTheDocument();
    expect(screen.getByText('2099年03月')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清除' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '今天' })).toBeInTheDocument();
  }, 15000);
});