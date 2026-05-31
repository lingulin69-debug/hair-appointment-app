import type { Client } from '../types';
import type { ClientSpendingSummary } from './clientSpending';

type ClientExportRow = {
  顧客ID: string;
  姓名: string;
  電話: string;
  喜好: string;
  慣用商品: string;
  上次到訪: string;
  到訪次數: number | '';
  上次消費日期: string;
  上次消費項目: string;
  上次消費金額: number | '';
  累積消費: number;
  交易筆數: number;
};

type ClientTransactionExportRow = {
  顧客ID: string;
  姓名: string;
  交易日期: string;
  項目摘要: string;
  成交金額: number;
  折扣金額: number;
  調整金額: number;
  交易識別: string;
};

type ClientExportData = {
  clientRows: ClientExportRow[];
  transactionRows: ClientTransactionExportRow[];
};

export function buildClientExportData(
  clients: Client[] | null | undefined,
  spendingByClientId: Record<string, ClientSpendingSummary> | null | undefined
): ClientExportData {
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeSpendingByClientId = spendingByClientId ?? {};

  const clientRows: ClientExportRow[] = safeClients.map((client) => {
    const summary = safeSpendingByClientId[client.id];
    const visitCount: number | '' = typeof client.visitCount === 'number' ? client.visitCount : '';
    const lastTransactionAmount: number | '' =
      typeof summary?.lastTransactionAmount === 'number' ? summary.lastTransactionAmount : '';

    return {
      顧客ID: client.id,
      姓名: client.name,
      電話: client.phone,
      喜好: client.preference,
      慣用商品: client.product,
      上次到訪: client.lastVisit ?? '',
      到訪次數: visitCount,
      上次消費日期: summary?.lastTransactionDate ?? '',
      上次消費項目: summary?.lastTransactionSummary ?? '',
      上次消費金額: lastTransactionAmount,
      累積消費: summary?.totalSpent ?? 0,
      交易筆數: summary?.transactionCount ?? 0,
    };
  });

  const transactionRows = safeClients.flatMap((client) => {
    const summary = safeSpendingByClientId[client.id];
    const history = summary?.transactionHistory ?? [];

    return history.map((entry) => ({
      顧客ID: client.id,
      姓名: client.name,
      交易日期: entry.dateStr,
      項目摘要: entry.summary,
      成交金額: entry.totalAmount,
      折扣金額: entry.discountAmount,
      調整金額: entry.adjustmentAmount,
      交易識別: entry.transactionId,
    }));
  });

  return { clientRows, transactionRows };
}