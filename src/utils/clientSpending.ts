import type { CheckoutRecord, Client } from '../types';
import {
  getCheckoutActivityTimestamp,
  getCheckoutLegacyHistoryFingerprint,
  RECENT_DUPLICATE_CHECKOUT_WINDOW_MS,
} from './transactions';

export type ClientTransactionHistoryEntry = {
  transactionId: string;
  dateStr: string;
  summary: string;
  totalAmount: number;
  discountAmount: number;
  adjustmentAmount: number;
};

export type ClientSpendingSummary = {
  clientId: string;
  totalSpent: number;
  transactionCount: number;
  lastTransactionDate?: string;
  lastTransactionAmount?: number;
  lastTransactionSummary?: string;
  transactionHistory: ClientTransactionHistoryEntry[];
};

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('zh-TW');
}

function normalizeAppointmentId(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
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

function buildTransactionHistoryEntry(record: CheckoutRecord): ClientTransactionHistoryEntry {
  return {
    transactionId: record.id,
    dateStr: record.dateStr,
    summary: summarizeLineItems(record),
    totalAmount: record.totalAmount,
    discountAmount: record.discountAmount,
    adjustmentAmount: record.adjustmentAmount,
  };
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
  const seenAppointmentIds = new Set<string>();
  const recentDuplicateFingerprints = new Map<string, number | null>();

  for (const record of safeTransactions) {
    const appointmentId = normalizeAppointmentId(record.appointmentId);

    if (appointmentId) {
      if (seenAppointmentIds.has(appointmentId)) {
        continue;
      }

      seenAppointmentIds.add(appointmentId);
    }

    const resolvedClientId =
      record.clientId || clientIdsByName.get(normalizeName(record.clientName)) || '';

    if (!resolvedClientId) {
      continue;
    }

    const duplicateFingerprint = getCheckoutLegacyHistoryFingerprint({
      ...record,
      clientId: resolvedClientId,
    });
    const duplicateTimestamp = getCheckoutActivityTimestamp(record);
    const lastSeenDuplicateTimestamp = recentDuplicateFingerprints.get(duplicateFingerprint);

    if (
      lastSeenDuplicateTimestamp !== undefined &&
      duplicateTimestamp !== null &&
      lastSeenDuplicateTimestamp !== null &&
      Math.abs(lastSeenDuplicateTimestamp - duplicateTimestamp) <=
        RECENT_DUPLICATE_CHECKOUT_WINDOW_MS
    ) {
      continue;
    }

    recentDuplicateFingerprints.set(duplicateFingerprint, duplicateTimestamp);

    const existing = summaries.get(resolvedClientId);
    const historyEntry = buildTransactionHistoryEntry(record);

    if (!existing) {
      summaries.set(resolvedClientId, {
        clientId: resolvedClientId,
        totalSpent: record.totalAmount,
        transactionCount: 1,
        lastTransactionDate: record.dateStr,
        lastTransactionAmount: record.totalAmount,
        lastTransactionSummary: historyEntry.summary,
        transactionHistory: [historyEntry],
      });
      continue;
    }

    summaries.set(resolvedClientId, {
      ...existing,
      totalSpent: existing.totalSpent + record.totalAmount,
      transactionCount: existing.transactionCount + 1,
      transactionHistory: [...existing.transactionHistory, historyEntry],
    });
  }

  return Object.fromEntries(summaries.entries());
}