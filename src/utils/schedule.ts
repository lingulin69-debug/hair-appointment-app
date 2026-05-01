import type { Appointment } from '../types';

export type DateRange = {
  startDateStr: string;
  endDateStr: string;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isExactDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsedDate.getTime()) && formatDateString(parsedDate) === value;
}

export function getDateRangeForMonth(anchorDate: Date): DateRange {
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);

  return {
    startDateStr: formatDateString(start),
    endDateStr: formatDateString(end),
  };
}

export function getDateRangeForTrailingDays(
  days: number,
  anchorDate: Date = new Date()
): DateRange {
  const safeDays = Math.max(1, days);
  const end = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate()
  );
  const start = new Date(end);
  start.setDate(end.getDate() - (safeDays - 1));

  return {
    startDateStr: formatDateString(start),
    endDateStr: formatDateString(end),
  };
}

export function getDateRangeForTrailingMonths(
  months: number,
  anchorDate: Date = new Date()
): DateRange {
  const safeMonths = Math.max(1, months);
  const end = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate()
  );
  const start = new Date(end.getFullYear(), end.getMonth() - (safeMonths - 1), 1);

  return {
    startDateStr: formatDateString(start),
    endDateStr: formatDateString(end),
  };
}

export function sortAppointmentsByDateTime(
  appointments: Appointment[] | null | undefined
): Appointment[] {
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  return [...safeAppointments].sort((left, right) =>
    `${left.dateStr} ${left.time}`.localeCompare(`${right.dateStr} ${right.time}`)
  );
}

export function groupAppointmentsByDate(
  appointments: Appointment[] | null | undefined
): Record<string, Appointment[]> {
  return sortAppointmentsByDateTime(appointments).reduce<Record<string, Appointment[]>>(
    (groups, appointment) => {
      if (!groups[appointment.dateStr]) {
        groups[appointment.dateStr] = [];
      }

      groups[appointment.dateStr].push(appointment);
      return groups;
    },
    {}
  );
}
