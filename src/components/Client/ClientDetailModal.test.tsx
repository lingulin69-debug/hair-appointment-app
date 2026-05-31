import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientDetailModal } from './ClientDetailModal';
import type { Client } from '../../types';
import type { ClientSpendingSummary } from '../../utils/clientSpending';

const client: Client = {
  id: 'client-1',
  name: 'Alice',
  phone: '0912345678',
  preference: '喜歡低層次',
  product: '護髮油',
};

const spendingSummary: ClientSpendingSummary = {
  clientId: 'client-1',
  totalSpent: 4450,
  transactionCount: 2,
  lastTransactionDate: '2026-05-09',
  lastTransactionAmount: 3250,
  lastTransactionSummary: 'Color + Care Oil',
  transactionHistory: [
    {
      transactionId: 'tx-latest',
      dateStr: '2026-05-09',
      summary: 'Color + Care Oil',
      totalAmount: 3250,
      discountAmount: 300,
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
  ],
};

describe('ClientDetailModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('shows transaction history with date, summary, amount, and discount info', () => {
    render(
      <ClientDetailModal
        isOpen={true}
        client={client}
        spendingSummary={spendingSummary}
        isSpendingLoading={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCall={vi.fn()}
      />
    );

    vi.runAllTimers();

    expect(screen.getByText('2026-05-09')).toBeInTheDocument();
    expect(screen.getByText('Color + Care Oil')).toBeInTheDocument();
    expect(screen.getByText('折扣 -$300')).toBeInTheDocument();
    expect(screen.getByText('$3,250')).toBeInTheDocument();
    expect(screen.getByText('2026-05-08')).toBeInTheDocument();
    expect(screen.getByText('Cut')).toBeInTheDocument();
    expect(screen.getByText('$1,200')).toBeInTheDocument();
  });
});