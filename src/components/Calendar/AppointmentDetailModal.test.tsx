import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('shows cancel but no delete action', () => {
    const onCallAppointment = vi.fn();

    render(
      <AppointmentDetailModal
        isOpen={true}
        appointment={appointment}
        onClose={vi.fn()}
        onCallAppointment={onCallAppointment}
        onEditAppointment={vi.fn()}
        onCheckoutAppointment={vi.fn()}
        onCancelAppointment={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '取消此預約' })).toBeInTheDocument();
    expect(screen.getByText('0912345678')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '撥打電話' }));
    expect(onCallAppointment).toHaveBeenCalledWith(appointment);
    expect(screen.queryByRole('button', { name: '刪除預約' })).not.toBeInTheDocument();
  });
});