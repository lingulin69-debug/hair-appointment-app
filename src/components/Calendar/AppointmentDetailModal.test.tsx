import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import type { Appointment } from '../../types';

const appointment: Appointment = {
  id: 'appt-1',
  clientId: 'client-1',
  clientName: '測試顧客',
  phone: '0912345678',
  dateStr: '2026-05-14',
  time: '10:00',
  service: '剪髮',
  totalPrice: 600,
  pax: 1,
  notes: '',
  status: 'pending',
  rescheduleCount: 0,
};

describe('AppointmentDetailModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('shows cancel but no delete action', () => {
    render(
      <AppointmentDetailModal
        isOpen={true}
        appointment={appointment}
        onClose={vi.fn()}
        onEditAppointment={vi.fn()}
        onCheckoutAppointment={vi.fn()}
        onCancelAppointment={vi.fn()}
      />
    );

    vi.runAllTimers();

    expect(screen.getByRole('button', { name: '取消此預約' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '刪除預約' })).not.toBeInTheDocument();
  });
});