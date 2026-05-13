import type { Appointment, Revenue } from '../types';
import { formatDateString } from './schedule';

export type RevenueEvent = {
  id: string;
  date: string;
  income: number;
  expense: number;
  balance: number;
  source: 'appointment' | 'manual';
  category: string;
  label: string;
  note?: string;
};

export type RevenueSummary = {
  appointmentIncome: number;
  manualIncome: number;
  manualExpense: number;
  balance: number;
};

export type DailyRevenueRow = {
  date: string;
  income: number;
  expense: number;
  balance: number;
  events: RevenueEvent[];
};

export type MonthlyRevenueRow = {
  monthKey: string;
  income: number;
  expense: number;
  balance: number;
  eventCount: number;
};

export type SettlementRangeRow = {
  key: string;
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  balance: number;
  eventCount: number;
};

function normalizeAmount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeCategory(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function buildRevenueEvents(
  appointments: Appointment[] | null | undefined,
  revenues: Revenue[] | null | undefined
): RevenueEvent[] {
  const appointmentEvents = (Array.isArray(appointments) ? appointments : [])
    .filter(
      (appointment) =>
        appointment.status !== 'cancelled' &&
        typeof appointment.dateStr === 'string' &&
        appointment.dateStr.length > 0 &&
        normalizeAmount(appointment.totalPrice) > 0
    )
    .map((appointment) => {
      const amount = normalizeAmount(appointment.totalPrice);

      return {
        id: `appointment:${appointment.id}`,
        date: appointment.dateStr,
        income: amount,
        expense: 0,
        balance: amount,
        source: 'appointment' as const,
        category: '預約收入',
        label: `${appointment.clientName} · ${appointment.service}`,
        note: appointment.time,
      };
    });

  const manualEvents = (Array.isArray(revenues) ? revenues : [])
    .map((entry) => {
      const amount = normalizeAmount(entry.amount);
      const isExpense = entry.kind === 'expense';

      return {
        id: entry.id,
        date: entry.date,
        income: isExpense ? 0 : amount,
        expense: isExpense ? amount : 0,
        balance: isExpense ? -amount : amount,
        source: 'manual' as const,
        category: normalizeCategory(entry.category, isExpense ? '其他支出' : '其他收入'),
        label: isExpense ? '手動扣帳' : '手動加帳',
        ...(typeof entry.note === 'string' && entry.note.trim()
          ? { note: entry.note.trim() }
          : {}),
      };
    })
    .filter((entry) => entry.date && entry.income + entry.expense > 0);

  return [...appointmentEvents, ...manualEvents].sort((left, right) =>
    `${left.date} ${left.source} ${left.id}`.localeCompare(
      `${right.date} ${right.source} ${right.id}`
    )
  );
}

export function summarizeRevenueEvents(events: RevenueEvent[]): RevenueSummary {
  return events.reduce<RevenueSummary>(
    (summary, event) => {
      if (event.source === 'appointment') {
        summary.appointmentIncome += event.income;
      } else if (event.income > 0) {
        summary.manualIncome += event.income;
      }

      summary.manualExpense += event.expense;
      summary.balance += event.balance;
      return summary;
    },
    {
      appointmentIncome: 0,
      manualIncome: 0,
      manualExpense: 0,
      balance: 0,
    }
  );
}

export function buildDailyRevenueRows(
  events: RevenueEvent[],
  bucketDates: string[]
): DailyRevenueRow[] {
  const eventMap = new Map<string, RevenueEvent[]>();

  for (const event of events) {
    const dayEvents = eventMap.get(event.date) ?? [];
    dayEvents.push(event);
    eventMap.set(event.date, dayEvents);
  }

  return [...bucketDates]
    .map((date) => {
      const dayEvents = (eventMap.get(date) ?? []).slice().sort((left, right) =>
        `${left.source} ${left.id}`.localeCompare(`${right.source} ${right.id}`)
      );

      const income = dayEvents.reduce((total, event) => total + event.income, 0);
      const expense = dayEvents.reduce((total, event) => total + event.expense, 0);

      return {
        date,
        income,
        expense,
        balance: income - expense,
        events: dayEvents,
      };
    })
    .reverse();
}

export function buildMonthlyRevenueRows(events: RevenueEvent[]): MonthlyRevenueRow[] {
  const grouped = events.reduce<Map<string, RevenueEvent[]>>((months, event) => {
    const monthKey = event.date.slice(0, 7);
    const monthEvents = months.get(monthKey) ?? [];
    monthEvents.push(event);
    months.set(monthKey, monthEvents);
    return months;
  }, new Map<string, RevenueEvent[]>());

  return [...grouped.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([monthKey, monthEvents]) => {
      const income = monthEvents.reduce((total, event) => total + event.income, 0);
      const expense = monthEvents.reduce((total, event) => total + event.expense, 0);

      return {
        monthKey,
        income,
        expense,
        balance: income - expense,
        eventCount: monthEvents.length,
      };
    });
}

function normalizeDateOnly(anchorDate: Date): Date {
  return new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
}

function buildSettlementRangeRow(
  events: RevenueEvent[],
  key: string,
  startDate: string,
  endDate: string
): SettlementRangeRow {
  const rangeEvents = events.filter((event) => event.date >= startDate && event.date <= endDate);
  const income = rangeEvents.reduce((total, event) => total + event.income, 0);
  const expense = rangeEvents.reduce((total, event) => total + event.expense, 0);

  return {
    key,
    startDate,
    endDate,
    income,
    expense,
    balance: income - expense,
    eventCount: rangeEvents.length,
  };
}

function getWeekStart(anchorDate: Date): Date {
  const weekStart = normalizeDateOnly(anchorDate);
  const offset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - offset);
  return weekStart;
}

export function buildWeeklySettlementRows(
  events: RevenueEvent[],
  anchorDate: Date = new Date()
): SettlementRangeRow[] {
  const today = normalizeDateOnly(anchorDate);
  const currentWeekStart = getWeekStart(today);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);

  return [
    buildSettlementRangeRow(
      events,
      'current-week',
      formatDateString(currentWeekStart),
      formatDateString(today)
    ),
    buildSettlementRangeRow(
      events,
      'previous-week',
      formatDateString(previousWeekStart),
      formatDateString(previousWeekEnd)
    ),
  ];
}

export function buildMonthlySettlementRows(
  events: RevenueEvent[],
  anchorDate: Date = new Date()
): SettlementRangeRow[] {
  const today = normalizeDateOnly(anchorDate);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  return [
    buildSettlementRangeRow(
      events,
      'current-month',
      formatDateString(currentMonthStart),
      formatDateString(today)
    ),
    buildSettlementRangeRow(
      events,
      'previous-month',
      formatDateString(previousMonthStart),
      formatDateString(previousMonthEnd)
    ),
  ];
}