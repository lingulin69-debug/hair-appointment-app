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

interface ClientDetailModalProps {
  isOpen: boolean;
  client: Client | null;
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
      <div className="text-[11px] font-bold tracking-[0.28em] text-[#8C7A6B]">
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap text-base font-semibold leading-7 text-[#4A3B32]">
        {value?.trim() || fallback}
      </div>
    </div>
  );
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  isOpen,
  client,
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
        className={`${modalShell.panel} ${modalShell.centeredPanel} w-full max-w-2xl rounded-[32px] border border-[#E6DED2] bg-[#FFFCF7] p-6 md:p-8 will-change-transform ${modalAnimation.base} ${
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
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
