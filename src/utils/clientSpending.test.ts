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
  });
});