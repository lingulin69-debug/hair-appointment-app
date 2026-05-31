import type { Appointment } from '../types';

export function getOccupiedAppointmentTimes(
  appointments: Appointment[] | null | undefined,
  selectedDateStr: string,
  excludedAppointmentId: string | null = null
): Set<string> {
  if (!selectedDateStr || !Array.isArray(appointments) || appointments.length === 0) {
    return new Set<string>();
  }

  return new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.dateStr === selectedDateStr &&
          appointment.status !== 'cancelled' &&
          appointment.id !== excludedAppointmentId &&
          typeof appointment.time === 'string' &&
          appointment.time.length > 0
      )
      .map((appointment) => appointment.time)
  );
}

export function isAppointmentTimeOccupied(
  appointments: Appointment[] | null | undefined,
  selectedDateStr: string,
  time: string,
  excludedAppointmentId: string | null = null
): boolean {
  if (!selectedDateStr || !time || !Array.isArray(appointments) || appointments.length === 0) {
    return false;
  }

  return appointments.some(
    (appointment) =>
      appointment.dateStr === selectedDateStr &&
      appointment.status !== 'cancelled' &&
      appointment.time === time &&
      appointment.id !== excludedAppointmentId
  );
}