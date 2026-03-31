import { describe, expect, it } from 'vitest';
import {
  getDateRangeForMonth,
  getDateRangeForTrailingDays,
  groupAppointmentsByDate,
  isExactDateString,
} from './schedule';
import type { Appointment } from '../types';

describe('schedule utilities', () => {
  it('builds a full date range for the visible month', () => {
    const range = getDateRangeForMonth(new Date(2026, 2, 15));

    expect(range).toEqual({
      startDateStr: '2026-03-01',
      endDateStr: '2026-03-31',
    });
  });

  it('builds a trailing date range inclusive of the anchor date', () => {
    const range = getDateRangeForTrailingDays(7, new Date(2026, 2, 29));

    expect(range).toEqual({
      startDateStr: '2026-03-23',
      endDateStr: '2026-03-29',
    });
  });

  it('validates local date strings without UTC shift issues', () => {
    expect(isExactDateString('2026-03-29')).toBe(true);
    expect(isExactDateString('2026-02-30')).toBe(false);
    expect(isExactDateString('2026/03/29')).toBe(false);
  });

  it('groups appointments by date without losing same-day ordering', () => {
    const appointments: Appointment[] = [
      {
        id: 'b',
        clientName: 'Second',
        time: '11:00',
        service: 'Color',
        pax: 1,
        notes: '',
        dateStr: '2026-03-29',
        totalPrice: 2000,
        status: 'pending',
        rescheduleCount: 0,
      },
      {
        id: 'a',
        clientName: 'First',
        time: '10:00',
        service: 'Cut',
        pax: 1,
        notes: '',
        dateStr: '2026-03-29',
        totalPrice: 800,
        status: 'pending',
        rescheduleCount: 0,
      },
      {
        id: 'c',
        clientName: 'Other Day',
        time: '09:30',
        service: 'Wash',
        pax: 1,
        notes: '',
        dateStr: '2026-03-30',
        totalPrice: 500,
        status: 'pending',
        rescheduleCount: 0,
      },
    ];

    const grouped = groupAppointmentsByDate(appointments);

    expect(Object.keys(grouped)).toEqual(['2026-03-29', '2026-03-30']);
    expect(grouped['2026-03-29'].map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(grouped['2026-03-30'].map((entry) => entry.id)).toEqual(['c']);
  });
});
