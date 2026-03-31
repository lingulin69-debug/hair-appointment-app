import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Client } from '../../types';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';

interface Props {
  isOpen: boolean;
  initialData?: Client;
  onConfirm: (data: Omit<Client, 'id'>) => void;
  onClose: () => void;
}

const EMPTY_FORM: Omit<Client, 'id'> = {
  name: '',
  phone: '',
  preference: '',
  product: '',
};

export default function ClientForm({
  isOpen,
  initialData,
  onConfirm,
  onClose,
}: Props) {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState<Omit<Client, 'id'>>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(
      initialData
        ? {
            name: initialData.name,
            phone: initialData.phone,
            preference: initialData.preference,
            product: initialData.product,
            lastVisit: initialData.lastVisit,
            createdAt: initialData.createdAt,
            updatedAt: initialData.updatedAt,
          }
        : EMPTY_FORM
    );
  }, [initialData, isOpen]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  if (!shouldRender) {
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
        className={`${modalShell.panel} ${modalShell.centeredPanel} flex w-full max-w-lg flex-col overflow-y-auto p-8 md:p-12 ${modalAnimation.base} ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="mb-8 flex items-center justify-between border-b border-[#E2DCD0] pb-6">
          <h2 className="text-4xl font-black tracking-widest text-[#4A3B32]">
            {isEdit ? '編輯顧客' : '新增顧客'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 hover:bg-[#F4F0EA] ${interactionMotion.subtleButton}`}
            aria-label="關閉顧客表單"
          >
            <X size={24} className="text-[#8C7A6B]" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto pr-1">
          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              姓名 NAME
            </label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-2xl font-black text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
              placeholder="請輸入顧客姓名"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              電話 PHONE
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-xl font-bold text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
              placeholder="請輸入電話號碼"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              喜好 PREFERENCE
            </label>
            <textarea
              value={form.preference}
              onChange={(event) => updateField('preference', event.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-lg font-bold text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
              placeholder="例如：怕熱、喜歡自然蓬鬆、指定瀏海長度"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              慣用商品 PRODUCT
            </label>
            <input
              type="text"
              value={form.product}
              onChange={(event) => updateField('product', event.target.value)}
              placeholder="例如：深層護髮素"
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-lg font-bold text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4 border-t border-[#E2DCD0] pt-8">
          <button
            type="button"
            onClick={() => onConfirm(form)}
            disabled={!form.name.trim()}
            className={`w-full rounded-2xl bg-[#4A3B32] py-5 text-xl font-black tracking-widest text-white shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none ${interactionMotion.button}`}
          >
            {isEdit ? '儲存顧客資料' : '新增顧客資料'}
          </button>
        </div>
      </div>
    </div>
  );
}
