import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { StoreItem } from '../../types';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';

type ItemData = {
  name: string;
  price: string;
  duration: string;
  type: 'service' | 'product';
  color?: string;
};

const ITEM_COLOR_PRESETS = [
  { hex: '#F4A7A7', label: '玫瑞粉' },
  { hex: '#F6C384', label: '暖橙' },
  { hex: '#9FD8D1', label: '青綠' },
  { hex: '#A7C8F2', label: '天藍' },
  { hex: '#C8B3F2', label: '藰衣草' },
  { hex: '#A8D5A2', label: '草綠' },
  { hex: '#F5E59A', label: '鵝黃' },
  { hex: '#F2B3C8', label: '蜜桃' },  { hex: '#FF9AA2', label: '亮粉' },
  { hex: '#FFDAC1', label: '蜜桃橙' },
  { hex: '#B5EAD7', label: '薄荷' },
  { hex: '#C7CEEA', label: '淡靛' },
  { hex: '#E2B4BD', label: '玫瑰灰' },
  { hex: '#D4C5A9', label: '奶棕' },];

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ItemData) => void;
  initialData?: StoreItem | null;
}

const EMPTY_ITEM: ItemData = {
  name: '',
  price: '',
  duration: '',
  type: 'service',
  color: '',
};

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialData,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);
  const [itemData, setItemData] = useState<ItemData>(EMPTY_ITEM);
  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setItemData(
      initialData
        ? {
            name: initialData.name,
            price: String(initialData.price),
            duration: initialData.type === 'service' ? initialData.duration : '',
            type: initialData.type,
            color: initialData.color ?? '',
          }
        : EMPTY_ITEM
    );
  }, [initialData, isOpen]);

  const handleDataChange = (
    field: keyof ItemData,
    value: string | 'service' | 'product'
  ) => {
    setItemData((previous) => ({ ...previous, [field]: value }));
  };

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
        className={`${modalShell.panel} ${modalShell.compactPanel} flex w-full max-w-sm flex-col overflow-y-auto p-8 md:p-10 ${modalAnimation.base} ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="mb-8 flex items-center justify-between border-b border-[#E2DCD0] pb-4">
          <h2 className="text-3xl font-black tracking-widest text-[#4A3B32]">
            {isEdit ? '編輯項目' : '新增項目'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 hover:bg-[#F4F0EA] ${interactionMotion.subtleButton}`}
            aria-label="關閉項目表單"
          >
            <X className="h-5 w-5 text-[#8C7A6B]" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
              類型 TYPE
            </label>
            <select
              value={itemData.type}
              onChange={(event) =>
                handleDataChange(
                  'type',
                  event.target.value as 'service' | 'product'
                )
              }
              className="w-full cursor-pointer rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-bold text-[#4A3B32] outline-none"
            >
              <option value="service">服務</option>
              <option value="product">商品</option>
            </select>
          </div>

          <div>
            <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
              名稱 NAME
            </label>
            <input
              type="text"
              value={itemData.name}
              onChange={(event) => handleDataChange('name', event.target.value)}
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-black text-[#4A3B32] outline-none focus:border-[#4A3B32]"
              placeholder="請輸入項目名稱"
            />
          </div>

          <div>
            <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
              價格 PRICE
            </label>
            <input
              type="number"
              min="0"
              value={itemData.price}
              onChange={(event) => handleDataChange('price', event.target.value)}
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-black text-[#4A3B32] outline-none focus:border-[#4A3B32]"
              placeholder="請輸入價格"
            />
          </div>

          {itemData.type === 'service' && (
            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                時長 DURATION
              </label>
              <input
                type="text"
                placeholder="例如：90 分鐘"
                value={itemData.duration}
                onChange={(event) =>
                  handleDataChange('duration', event.target.value)
                }
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-bold text-[#4A3B32] outline-none focus:border-[#4A3B32]"
              />
            </div>
          )}
        </div>

        <div className="mt-6">
          <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
            排程顏色 COLOR
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleDataChange('color', '')}
              aria-label="預設顏色"
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-[#F4F0EA] text-sm text-[#8C7A6B] transition-transform hover:scale-110 ${
                !itemData.color
                  ? 'border-[#4A3B32] shadow-md scale-110'
                  : 'border-[#E2DCD0]'
              }`}
            >
              —
            </button>
            {ITEM_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => handleDataChange('color', preset.hex)}
                aria-label={preset.label}
                style={{ backgroundColor: preset.hex }}
                className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${
                  itemData.color === preset.hex
                    ? 'border-[#4A3B32] shadow-md scale-110'
                    : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="pt-8">
          <button
            type="button"
            onClick={() => onConfirm(itemData)}
            disabled={!itemData.name.trim() || !itemData.price}
            className={`w-full rounded-2xl bg-[#4A3B32] py-5 text-xl font-black text-white shadow-md disabled:opacity-50 disabled:hover:translate-y-0 ${interactionMotion.button}`}
          >
            {isEdit ? '儲存項目' : '新增項目'}
          </button>
        </div>
      </div>
    </div>
  );
};
