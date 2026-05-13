import { describe, expect, it } from 'vitest';
import type { Appointment } from '../types';
import {
  getOccupiedAppointmentTimes,
  isAppointmentTimeOccupied,
} from './appointmentTime';

const appointments: Appointment[] = [
  {
    id: 'appt-1',
    clientName: 'Alice',
    time: '10:00',
    service: 'Cut',
    pax: 1,
    notes: '',
    dateStr: '2026-03-29',
    totalPrice: 1200,
    status: 'pending',
    rescheduleCount: 0,
  },
  {
    id: 'appt-2',
    clientName: 'Bob',
    time: '11:00',
    service: 'Color',
    pax: 1,
    notes: '',
    dateStr: '2026-03-29',
    totalPrice: 2200,
    status: 'pending',
    rescheduleCount: 0,
  },
  {
    id: 'appt-3',
    clientName: 'Cindy',
    time: '10:00',
    service: 'Wash',
    pax: 1,
    notes: '',
    dateStr: '2026-03-30',
    totalPrice: 500,
    status: 'pending',
    rescheduleCount: 0,
  },
];

describe('appointmentTime utilities', () => {
  it('returns occupied times for the selected day only', () => {
    expect([...getOccupiedAppointmentTimes(appointments, '2026-03-29')]).toEqual([
      '10:00',
      '11:00',
    ]);
  });

  it('keeps the current appointment time available while editing', () => {
    expect(
      isAppointmentTimeOccupied(appointments, '2026-03-29', '10:00', 'appt-1')
    ).toBe(false);
  });

  it('still marks other appointments on the same slot as occupied', () => {
    expect(
      isAppointmentTimeOccupied(appointments, '2026-03-29', '11:00', 'appt-1')
    ).toBe(true);
  });
});