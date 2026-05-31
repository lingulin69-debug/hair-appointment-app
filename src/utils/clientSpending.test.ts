import { describe, expect, it } from 'vitest';
import type { CheckoutRecord, Client } from '../types';
import { buildClientSpendingSummaryMap } from './clientSpending';

const clients: Client[] = [
  {
    id: 'client-1',
    name: 'Alice',
    phone: '0912345678',
    preference: '',
    product: '',
  },
];

const transactions: CheckoutRecord[] = [
  {
    id: 'tx-older',
    clientId: 'client-1',
    clientName: 'Alice',
    appointmentId: 'appt-1',
    dateStr: '2026-05-08',
    lineItems: [
      {
        itemId: 'service-1',
        itemName: 'Cut',
        itemType: 'service',
        quantity: 1,
        unitPrice: 1200,
        totalPrice: 1200,
      },
    ],
    subtotal: 1200,
    discountAmount: 0,
    adjustmentAmount: 0,
    totalAmount: 1200,
    status: 'completed',
    createdAt: '2026-05-08T10:00:00.000Z',
    updatedAt: '2026-05-08T10:00:00.000Z',
  },
  {
    id: 'tx-latest',
    clientId: 'client-1',
    clientName: 'Alice',
    appointmentId: 'appt-2',
    dateStr: '2026-05-09',
    lineItems: [
      {
        itemId: 'service-1',
        itemName: 'Color',
        itemType: 'service',
        quantity: 1,
        unitPrice: 2800,
        totalPrice: 2800,
      },
      {
        itemId: 'product-1',
        itemName: 'Care Oil',
        itemType: 'product',
        quantity: 1,
        unitPrice: 450,
        totalPrice: 450,
      },
    ],
    subtotal: 3250,
    discountAmount: 0,
    adjustmentAmount: 0,
    totalAmount: 3250,
    status: 'completed',
    createdAt: '2026-05-09T10:00:00.000Z',
    updatedAt: '2026-05-09T10:00:00.000Z',
  },
  {
    id: 'tx-draft',
    clientId: 'client-1',
    clientName: 'Alice',
    dateStr: '2026-05-10',
    lineItems: [],
    subtotal: 0,
    discountAmount: 0,
    adjustmentAmount: 0,
    totalAmount: 9999,
    status: 'draft',
  },
  {
    id: 'tx-duplicate',
    clientId: 'client-1',
    clientName: 'Alice',
    appointmentId: 'appt-2',
    dateStr: '2026-05-09',
    lineItems: [
      {
        itemId: 'service-1',
        itemName: 'Color',
        itemType: 'service',
        quantity: 1,
        unitPrice: 2800,
        totalPrice: 2800,
      },
      {
        itemId: 'product-1',
        itemName: 'Care Oil',
        itemType: 'product',
        quantity: 1,
        unitPrice: 450,
        totalPrice: 450,
      },
    ],
    subtotal: 3250,
    discountAmount: 0,
    adjustmentAmount: 0,
    totalAmount: 3250,
    status: 'completed',
    createdAt: '2026-05-09T10:00:01.000Z',
    updatedAt: '2026-05-09T10:00:01.000Z',
  },
];

describe('clientSpending utilities', () => {
  it('builds last-spend and total-spend summaries from completed transactions', () => {
    const summaryMap = buildClientSpendingSummaryMap(clients, transactions);
    const summary = summaryMap['client-1'];

    expect(summary).toMatchObject({
      clientId: 'client-1',
      totalSpent: 4450,
      transactionCount: 2,
      lastTransactionDate: '2026-05-09',
      lastTransactionAmount: 3250,
      lastTransactionSummary: 'Color + Care Oil',
    });

    expect(summary.transactionHistory).toMatchObject([
      {
        dateStr: '2026-05-09',
        summary: 'Color + Care Oil',
        totalAmount: 3250,
        discountAmount: 0,
        adjustmentAmount: 0,
      },
      {
        transactionId: 'tx-older',
        dateStr: '2026-05-08',
        summary: 'Cut',
        totalAmount: 1200,
        discountAmount: 0,
        adjustmentAmount: 0,
      },
    ]);
  });

  it('ignores duplicate completed transactions for the same appointment', () => {
    const summaryMap = buildClientSpendingSummaryMap(clients, transactions);
    const summary = summaryMap['client-1'];

    expect(summary.transactionCount).toBe(2);
    expect(summary.totalSpent).toBe(4450);
    expect(summary.transactionHistory).toHaveLength(2);
  });

  it('ignores near-identical same-day transactions created within a few minutes', () => {
    const summaryMap = buildClientSpendingSummaryMap(clients, [
      {
        id: 'tx-a',
        clientId: 'client-1',
        clientName: 'Alice',
        dateStr: '2026-05-11',
        lineItems: [
          {
            itemId: 'service-1',
            itemName: 'Cut',
            itemType: 'service',
            quantity: 1,
            unitPrice: 1200,
            totalPrice: 1200,
          },
        ],
        subtotal: 1200,
        discountAmount: 0,
        adjustmentAmount: 0,
        totalAmount: 1200,
        status: 'completed',
        createdAt: '2026-05-11T10:01:00.000Z',
        updatedAt: '2026-05-11T10:01:00.000Z',
      },
      {
        id: 'tx-b',
        clientId: 'client-1',
        clientName: 'Alice',
        dateStr: '2026-05-11',
        lineItems: [
          {
            itemId: 'service-1',
            itemName: 'Cut',
            itemType: 'service',
            quantity: 1,
            unitPrice: 1200,
            totalPrice: 1200,
          },
        ],
        subtotal: 1200,
        discountAmount: 0,
        adjustmentAmount: 0,
        totalAmount: 1200,
        status: 'completed',
        createdAt: '2026-05-11T10:03:00.000Z',
        updatedAt: '2026-05-11T10:03:00.000Z',
      },
    ]);

    const summary = summaryMap['client-1'];

    expect(summary.transactionCount).toBe(1);
    expect(summary.totalSpent).toBe(1200);
    expect(summary.transactionHistory).toHaveLength(1);
  });

  it('ignores legacy duplicate rows even when metadata differs', () => {
    const summaryMap = buildClientSpendingSummaryMap(clients, [
      {
        id: 'tx-newer',
        clientId: 'client-1',
        clientName: 'Alice',
        appointmentId: 'appt-9',
        dateStr: '2026-05-12',
        lineItems: [
          {
            itemId: 'service-new',
            itemName: '染髮',
            itemType: 'service',
            quantity: 1,
            unitPrice: 2800,
            totalPrice: 2800,
            note: '現場加購',
          },
          {
            itemId: 'product-new',
            itemName: '護髮',
            itemType: 'product',
            quantity: 1,
            unitPrice: 450,
            totalPrice: 450,
          },
        ],
        subtotal: 3250,
        discountAmount: 100,
        adjustmentAmount: 0,
        totalAmount: 3150,
        paymentMethod: 'card',
        note: '新版資料',
        status: 'completed',
        createdAt: '2026-05-12T10:04:00.000Z',
        updatedAt: '2026-05-12T10:04:00.000Z',
      },
      {
        id: 'tx-older-legacy',
        clientId: 'client-1',
        clientName: 'Alice',
        appointmentId: 'appt-legacy',
        dateStr: '2026-05-12',
        lineItems: [
          {
            itemId: 'legacy-service-id',
            itemName: '染髮',
            itemType: 'service',
            quantity: 1,
            unitPrice: 2800,
            totalPrice: 2800,
            note: '舊系統備註',
          },
          {
            itemId: 'legacy-product-id',
            itemName: '護髮',
            itemType: 'product',
            quantity: 1,
            unitPrice: 450,
            totalPrice: 450,
            note: '不同備註',
          },
        ],
        subtotal: 3250,
        discountAmount: 100,
        adjustmentAmount: 0,
        totalAmount: 3150,
        paymentMethod: 'cash',
        note: '舊版資料',
        status: 'completed',
        createdAt: '2026-05-12T10:00:30.000Z',
        updatedAt: '2026-05-12T10:00:30.000Z',
      },
    ]);

    const summary = summaryMap['client-1'];

    expect(summary.transactionCount).toBe(1);
    expect(summary.totalSpent).toBe(3150);
    expect(summary.transactionHistory).toHaveLength(1);
    expect(summary.transactionHistory[0]?.transactionId).toBe('tx-newer');
  });
});