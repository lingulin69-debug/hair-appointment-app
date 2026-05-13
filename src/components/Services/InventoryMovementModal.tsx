import React, { useEffect, useMemo, useState } from 'react';
import { PackageMinus, PackagePlus, X } from 'lucide-react';
import type {
  InventoryMovement,
  InventoryMovementReason,
  InventoryMovementType,
  StoreItem,
} from '../../types';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';
import { formatDateString } from '../../utils/schedule';

interface InventoryMovementModalProps {
  isOpen: boolean;
  products: StoreItem[];
  initialItem?: StoreItem | null;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (movement: Omit<InventoryMovement, 'id'>) => void | Promise<void>;
}

const STOCK_IN_REASONS: InventoryMovementReason[] = ['purchase', 'return', 'other'];
const STOCK_OUT_REASONS: InventoryMovementReason[] = ['sale', 'return', 'other'];

export const InventoryMovementModal: React.FC<InventoryMovementModalProps> = ({
  isOpen,
  products,
  initialItem = null,
  isSaving = false,
  onClose,
  onConfirm,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);
  const [itemId, setItemId] = useState('');
  const [movementType, setMovementType] = useState<InventoryMovementType>('stock_in');
  const [reason, setReason] = useState<InventoryMovementReason>('purchase');
  const [quantity, setQuantity] = useState('1');
  const [dateStr, setDateStr] = useState(() => formatDateString(new Date()));
  const [unitCost, setUnitCost] = useState('');
  const [note, setNote] = useState('');

  const reasonOptions = useMemo(
    () => (movementType === 'stock_in' ? STOCK_IN_REASONS : STOCK_OUT_REASONS),
    [movementType]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setItemId(initialItem?.id ?? products[0]?.id ?? '');
    setMovementType('stock_in');
    setReason('purchase');
    setQuantity('1');
    setDateStr(formatDateString(new Date()));
    setUnitCost('');
    setNote('');
  }, [initialItem, isOpen, products]);

  useEffect(() => {
    setReason(reasonOptions[0] ?? 'other');
  }, [reasonOptions]);

  const selectedItem = products.find((item) => item.id === itemId) ?? null;

  const handleConfirm = () => {
    if (!selectedItem || isSaving) {
      return;
    }

    const parsedQuantity = Math.max(1, Number(quantity) || 1);
    const parsedUnitCost = Number(unitCost);

    onConfirm({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      movementType,
      reason,
      quantity: parsedQuantity,
      dateStr,
      ...(movementType === 'stock_in' && Number.isFinite(parsedUnitCost) && parsedUnitCost >= 0
        ? { unitCost: parsedUnitCost }
        : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
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
        className={`${modalShell.panel} ${modalShell.compactPanel} flex w-full max-w-xl flex-col overflow-y-auto rounded-[32px] border border-[#E6DED2] bg-[#FFFCF7] p-8 md:p-10 ${modalAnimation.base} ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="mb-8 flex items-center justify-between border-b border-[#E2DCD0] pb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.28em] text-[#8C7A6B]">庫存異動</div>
            <h2 className="mt-2 text-3xl font-black tracking-widest text-[#4A3B32]">
              進貨 / 出貨
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 hover:bg-[#F4F0EA] ${interactionMotion.subtleButton}`}
            aria-label="關閉庫存異動視窗"
          >
            <X className="h-5 w-5 text-[#8C7A6B]" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
              商品
            </label>
            <select
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              className="w-full cursor-pointer rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-bold text-[#4A3B32] outline-none"
            >
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                類型
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMovementType('stock_in')}
                  className={`rounded-2xl px-4 py-4 text-base font-black ${interactionMotion.subtleButton} ${
                    movementType === 'stock_in'
                      ? 'bg-[#4A3B32] text-white'
                      : 'border border-[#E2DCD0] bg-[#FCFAF5] text-[#4A3B32]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <PackagePlus className="h-4 w-4" />
                    進貨
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('stock_out')}
                  className={`rounded-2xl px-4 py-4 text-base font-black ${interactionMotion.subtleButton} ${
                    movementType === 'stock_out'
                      ? 'bg-[#A85145] text-white'
                      : 'border border-[#E2DCD0] bg-[#FCFAF5] text-[#4A3B32]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <PackageMinus className="h-4 w-4" />
                    出貨
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                原因
              </label>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as InventoryMovementReason)}
                className="w-full cursor-pointer rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-bold text-[#4A3B32] outline-none"
              >
                {reasonOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'purchase'
                      ? '進貨'
                      : option === 'sale'
                        ? '銷售'
                        : option === 'return'
                          ? '退貨'
                          : '其他'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                數量
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-black text-[#4A3B32] outline-none focus:border-[#4A3B32]"
              />
            </div>
            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                日期
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(event) => setDateStr(event.target.value)}
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-base font-bold text-[#4A3B32] outline-none focus:border-[#4A3B32]"
              />
            </div>
            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                進貨成本
              </label>
              <input
                type="number"
                min="0"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                disabled={movementType !== 'stock_in'}
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-base font-bold text-[#4A3B32] outline-none focus:border-[#4A3B32] disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="選填"
              />
            </div>
          </div>

          <div>
            <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
              備註
            </label>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-base font-bold text-[#4A3B32] outline-none focus:border-[#4A3B32]"
              placeholder={selectedItem ? `補充 ${selectedItem.name} 異動原因` : '補充異動說明'}
            />
          </div>
        </div>

        <div className="pt-8">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedItem || isSaving}
            className={`w-full rounded-2xl bg-[#4A3B32] py-5 text-xl font-black text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.button}`}
          >
            {isSaving ? '儲存中...' : movementType === 'stock_in' ? '確認進貨' : '確認出貨'}
          </button>
        </div>
      </div>
    </div>
  );
};