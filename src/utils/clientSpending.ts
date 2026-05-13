import type { CheckoutRecord, Client } from '../types';

export type ClientSpendingSummary = {
  clientId: string;
  totalSpent: number;
  transactionCount: number;
  lastTransactionDate?: string;
  lastTransactionAmount?: number;
  lastTransactionSummary?: string;
};

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('zh-TW');
}

function summarizeLineItems(record: CheckoutRecord): string {
  const labels = record.lineItems
    .map((item) => item.itemName.trim())
    .filter(Boolean);

  if (labels.length === 0) {
    return '未命名消費';
  }

  const uniqueLabels = [...new Set(labels)];
  if (uniqueLabels.length <= 2) {
    return uniqueLabels.join(' + ');
  }

  return `${uniqueLabels.slice(0, 2).join(' + ')} + ${uniqueLabels.length - 2} 項`;
}

function buildSortKey(record: CheckoutRecord): string {
  return `${record.dateStr}|${record.updatedAt ?? record.createdAt ?? ''}|${record.id}`;
}

export function buildClientSpendingSummaryMap(
  clients: Client[] | null | undefined,
  transactions: CheckoutRecord[] | null | undefined
): Record<string, ClientSpendingSummary> {
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeTransactions = (Array.isArray(transactions) ? transactions : [])
    .filter((record) => record.status === 'completed' && record.totalAmount > 0)
    .slice()
    .sort((left, right) => buildSortKey(right).localeCompare(buildSortKey(left)));
  const clientIdsByName = new Map(
    safeClients.map((client) => [normalizeName(client.name), client.id] as const)
  );
  const summaries = new Map<string, ClientSpendingSummary>();

  for (const record of safeTransactions) {
    const resolvedClientId =
      record.clientId || clientIdsByName.get(normalizeName(record.clientName)) || '';

    if (!resolvedClientId) {
      continue;
    }

    const existing = summaries.get(resolvedClientId);

    if (!existing) {
      summaries.set(resolvedClientId, {
        clientId: resolvedClientId,
        totalSpent: record.totalAmount,
        transactionCount: 1,
        lastTransactionDate: record.dateStr,
        lastTransactionAmount: record.totalAmount,
        lastTransactionSummary: summarizeLineItems(record),
      });
      continue;
    }

    summaries.set(resolvedClientId, {
      ...existing,
      totalSpent: existing.totalSpent + record.totalAmount,
      transactionCount: existing.transactionCount + 1,
    });
  }

  return Object.fromEntries(summaries.entries());
}