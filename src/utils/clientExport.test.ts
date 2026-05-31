import { describe, expect, it } from 'vitest';
import type { Client } from '../types';
import type { ClientSpendingSummary } from './clientSpending';
import { buildClientExportData } from './clientExport';

const clients: Client[] = [
  {
    id: 'client-1',
    name: 'Alice',
    phone: '0912345678',
    preference: '喜歡低層次',
    product: '護髮油',
    lastVisit: '2026-05-09',
    visitCount: 3,
  },
];

const spendingByClientId: Record<string, ClientSpendingSummary> = {
  'client-1': {
    clientId: 'client-1',
    totalSpent: 4450,
    transactionCount: 2,
    lastTransactionDate: '2026-05-09',
    lastTransactionAmount: 3250,
    lastTransactionSummary: 'Color + Care Oil',
    transactionHistory: [
      {
        transactionId: 'tx-2',
        dateStr: '2026-05-09',
        summary: 'Color + Care Oil',
        totalAmount: 3250,
        discountAmount: 300,
        adjustmentAmount: 0,
      },
      {
        transactionId: 'tx-1',
        dateStr: '2026-05-08',
        summary: 'Cut',
        totalAmount: 1200,
        discountAmount: 0,
        adjustmentAmount: 0,
      },
    ],
  },
};

describe('clientExport utilities', () => {
  it('builds client and transaction rows for Excel export', () => {
    const result = buildClientExportData(clients, spendingByClientId);

    expect(result.clientRows).toEqual([
      {
        顧客ID: 'client-1',
        姓名: 'Alice',
        電話: '0912345678',
        喜好: '喜歡低層次',
        慣用商品: '護髮油',
        上次到訪: '2026-05-09',
        到訪次數: 3,
        上次消費日期: '2026-05-09',
        上次消費項目: 'Color + Care Oil',
        上次消費金額: 3250,
        累積消費: 4450,
        交易筆數: 2,
      },
    ]);

    expect(result.transactionRows).toEqual([
      {
        顧客ID: 'client-1',
        姓名: 'Alice',
        交易日期: '2026-05-09',
        項目摘要: 'Color + Care Oil',
        成交金額: 3250,
        折扣金額: 300,
        調整金額: 0,
        交易識別: 'tx-2',
      },
      {
        顧客ID: 'client-1',
        姓名: 'Alice',
        交易日期: '2026-05-08',
        項目摘要: 'Cut',
        成交金額: 1200,
        折扣金額: 0,
        調整金額: 0,
        交易識別: 'tx-1',
      },
    ]);
  });
});