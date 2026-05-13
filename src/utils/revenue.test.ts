import { describe, expect, it } from 'vitest';
import {
  buildMonthlyRevenueRows,
  buildMonthlySettlementRows,
  buildWeeklySettlementRows,
  type RevenueEvent,
} from './revenue';

const events: RevenueEvent[] = [
  {
    id: 'prev-week-income',
    date: '2026-05-04',
    income: 1200,
    expense: 0,
    balance: 1200,
    source: 'appointment',
    category: '預約收入',
    label: '上一週服務',
  },
  {
    id: 'prev-week-expense',
    date: '2026-05-06',
    income: 0,
    expense: 300,
    balance: -300,
    source: 'manual',
    category: '材料成本',
    label: '手動扣帳',
  },
  {
    id: 'current-week-income',
    date: '2026-05-12',
    income: 2000,
    expense: 0,
    balance: 2000,
    source: 'appointment',
    category: '預約收入',
    label: '本週服務',
  },
  {
    id: 'current-week-expense',
    date: '2026-05-13',
    income: 0,
    expense: 400,
    balance: -400,
    source: 'manual',
    category: '材料成本',
    label: '手動扣帳',
  },
  {
    id: 'prev-month-income',
    date: '2026-04-20',
    income: 1500,
    expense: 0,
    balance: 1500,
    source: 'appointment',
    category: '預約收入',
    label: '上月服務',
  },
];

describe('revenue settlement utilities', () => {
  it('builds current-week and previous-week settlement rows using Monday-Sunday boundaries', () => {
    const [currentWeek, previousWeek] = buildWeeklySettlementRows(
      events,
      new Date(2026, 4, 13)
    );

    expect(currentWeek).toMatchObject({
      key: 'current-week',
      startDate: '2026-05-11',
      endDate: '2026-05-13',
      income: 2000,
      expense: 400,
      balance: 1600,
      eventCount: 2,
    });
    expect(previousWeek).toMatchObject({
      key: 'previous-week',
      startDate: '2026-05-04',
      endDate: '2026-05-10',
      income: 1200,
      expense: 300,
      balance: 900,
      eventCount: 2,
    });
  });

  it('builds current-month and previous-month settlement rows with fixed month boundaries', () => {
    const [currentMonth, previousMonth] = buildMonthlySettlementRows(
      events,
      new Date(2026, 4, 13)
    );

    expect(currentMonth).toMatchObject({
      key: 'current-month',
      startDate: '2026-05-01',
      endDate: '2026-05-13',
      income: 3200,
      expense: 700,
      balance: 2500,
      eventCount: 4,
    });
    expect(previousMonth).toMatchObject({
      key: 'previous-month',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      income: 1500,
      expense: 0,
      balance: 1500,
      eventCount: 1,
    });
  });

  it('builds month overview rows in reverse chronological order', () => {
    const rows = buildMonthlyRevenueRows(events);

    expect(rows).toEqual([
      {
        monthKey: '2026-05',
        income: 3200,
        expense: 700,
        balance: 2500,
        eventCount: 4,
      },
      {
        monthKey: '2026-04',
        income: 1500,
        expense: 0,
        balance: 1500,
        eventCount: 1,
      },
    ]);
  });
});