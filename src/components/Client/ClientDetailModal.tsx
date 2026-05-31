import React from 'react';
import { Pencil, Phone, Trash2, X } from 'lucide-react';
import type { Client } from '../../types';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';
import type { ClientSpendingSummary } from '../../utils/clientSpending';

interface ClientDetailModalProps {
  isOpen: boolean;
  client: Client | null;
  spendingSummary?: ClientSpendingSummary | null;
  isSpendingLoading?: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void | Promise<void>;
  onCall: (client: Client) => void;
}

type DetailRowProps = {
  label: string;
  value?: string;
  fallback: string;
};

function DetailRow({ label, value, fallback }: DetailRowProps) {
  return (
    <div className="rounded-[22px] border border-[#E6DED2] bg-[#F8F4EC] px-5 py-4">
      <div className="text-sm font-bold tracking-[0.28em] text-[#8C7A6B]">
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap text-lg font-semibold leading-7 text-[#4A3B32]">
        {value?.trim() || fallback}
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value: number): string {
  return `${value > 0 ? '+' : ''}${formatCurrency(value)}`;
}

function buildLastCheckoutValue(summary: ClientSpendingSummary | null): string | undefined {
  if (!summary || summary.lastTransactionAmount == null) {
    return undefined;
  }

  return [
    summary.lastTransactionDate,
    summary.lastTransactionSummary ?? '最近一筆交易',
    formatCurrency(summary.lastTransactionAmount),
  ]
    .filter(Boolean)
    .join('\n');
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  isOpen,
  client,
  spendingSummary = null,
  isSpendingLoading = false,
  onClose,
  onEdit,
  onDelete,
  onCall,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);

  if (!shouldRender || !client) {
    return null;
  }

  return (
    <div className={modalShell.overlay} role="dialog" aria-modal="true">
      <div
        className={`${modalShell.backdrop} ${backdropAnimation.base} ${
          isVisible ? backdropAnimation.enter : backdropAnimation.exit
        }`}
        onClick={onClose}
      />

      <div
        className={`${modalShell.panel} ${modalShell.centeredPanel} flex w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-[#E6DED2] bg-[#FFFCF7] p-6 md:p-8 ${modalAnimation.base} ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E8E1D6] pb-5">
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-[0.34em] text-[#8C7A6B]">
              顧客資訊
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-[#4A3B32] md:text-4xl">
              {client.name}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border border-[#E6DED2] bg-white p-2 text-[#6F6257] ${interactionMotion.subtleButton}`}
            aria-label="關閉顧客資訊"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailRow label="姓名 NAME" value={client.name} fallback="未填寫" />
            <DetailRow label="電話 PHONE" value={client.phone} fallback="尚未填寫電話" />
            <DetailRow
              label="喜好 PREFERENCE"
              value={client.preference}
              fallback="尚未記錄顧客喜好"
            />
            <DetailRow
              label="慣用商品 PRODUCT"
              value={client.product}
              fallback="尚未記錄慣用商品"
            />
            <DetailRow
              label="上次消費 LAST CHECKOUT"
              value={buildLastCheckoutValue(spendingSummary)}
              fallback={isSpendingLoading ? '交易資料同步中' : '尚無消費紀錄'}
            />
            <DetailRow
              label="累積消費 TOTAL SPENT"
              value={
                spendingSummary && spendingSummary.totalSpent > 0
                  ? `${formatCurrency(spendingSummary.totalSpent)}\n共 ${spendingSummary.transactionCount} 筆交易`
                  : undefined
              }
              fallback={isSpendingLoading ? '交易資料同步中' : '尚無消費總額'}
            />
          </div>

          <div className="mt-5 rounded-[28px] border border-[#E6DED2] bg-white/85 px-5 py-5">
            <div className="flex flex-col gap-2 border-b border-[#EEE5DA] pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-bold tracking-[0.32em] text-[#8C7A6B]">
                  交易紀錄 HISTORY
                </div>
                <div className="mt-2 text-xl font-black tracking-tight text-[#4A3B32]">
                  每筆日期、項目與成交金額
                </div>
              </div>
              <div className="text-sm font-bold text-[#7A6B5D]">
                {spendingSummary?.transactionCount ?? 0} 筆交易
              </div>
            </div>

            {isSpendingLoading ? (
              <div className="mt-4 rounded-[22px] border border-dashed border-[#DED4C7] bg-[#FBF7F1] px-4 py-4 text-sm font-semibold text-[#7A6B5D]">
                交易資料同步中
              </div>
            ) : spendingSummary?.transactionHistory.length ? (
              <div className="mt-4 space-y-3">
                {spendingSummary.transactionHistory.map((entry) => (
                  <div
                    key={entry.transactionId}
                    className="rounded-[22px] border border-[#E8E0D4] bg-[#FBF7F1] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold tracking-[0.28em] text-[#8C7A6B]">
                          {entry.dateStr}
                        </div>
                        <div className="mt-2 text-base font-black leading-6 text-[#4A3B32]">
                          {entry.summary}
                        </div>
                        {(entry.discountAmount > 0 || entry.adjustmentAmount !== 0) && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[#7A6B5D]">
                            {entry.discountAmount > 0 && (
                              <span className="rounded-full bg-[#FFF0E2] px-2.5 py-1 text-[#A45A3D]">
                                折扣 -{formatCurrency(entry.discountAmount)}
                              </span>
                            )}
                            {entry.adjustmentAmount !== 0 && (
                              <span className="rounded-full bg-[#F0E7DA] px-2.5 py-1 text-[#6F6257]">
                                調整 {formatSignedCurrency(entry.adjustmentAmount)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xs font-bold tracking-[0.24em] text-[#8C7A6B]">
                          成交金額
                        </div>
                        <div className="mt-2 text-lg font-black text-[#4A3B32] [font-variant-numeric:tabular-nums]">
                          {formatCurrency(entry.totalAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-dashed border-[#DED4C7] bg-[#FBF7F1] px-4 py-4 text-sm font-semibold text-[#7A6B5D]">
                尚無消費紀錄
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#E8E1D6] pt-5 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={() => onCall(client)}
            disabled={!client.phone.trim()}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6CEC2] bg-white px-5 py-3 text-sm font-bold text-[#4A3B32] disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.subtleButton}`}
          >
            <Phone className="h-4 w-4" />
            撥打電話
          </button>

          <button
            type="button"
            onClick={() => onEdit(client)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D6CEC2] bg-[#F6F0E6] px-5 py-3 text-sm font-bold text-[#4A3B32] ${interactionMotion.subtleButton}`}
          >
            <Pencil className="h-4 w-4" />
            編輯資料
          </button>

          <button
            type="button"
            onClick={() => onDelete(client)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#A85145] px-5 py-3 text-sm font-bold text-white ${interactionMotion.button}`}
          >
            <Trash2 className="h-4 w-4" />
            刪除顧客
          </button>
        </div>
      </div>
    </div>
  );
};
