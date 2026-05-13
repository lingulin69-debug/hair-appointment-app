import React, { useEffect, useMemo, useState } from 'react';
import { Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type {
  Appointment,
  CheckoutLineItem,
  CheckoutRecord,
  PaymentMethod,
  StoreItem,
} from '../../types';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';
import { createCheckoutDraftFromAppointment } from '../../utils/checkout';
import {
  calculateCheckoutSubtotal,
  calculateCheckoutTotal,
  sanitizeCheckoutLineItem,
} from '../../utils/transactions';

interface CheckoutModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  storeItems?: StoreItem[] | null;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (checkout: Omit<CheckoutRecord, 'id'>) => void | Promise<void>;
}

type DraftLineItem = CheckoutLineItem & {
  lineKey: string;
  locked?: boolean;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  appointment,
  storeItems = [],
  isSaving = false,
  onClose,
  onConfirm,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [adjustmentAmount, setAdjustmentAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');

  const safeStoreItems = Array.isArray(storeItems) ? storeItems : [];
  const productItems = useMemo(
    () => safeStoreItems.filter((item) => item.type === 'product'),
    [safeStoreItems]
  );

  useEffect(() => {
    if (!isOpen || !appointment) {
      return;
    }

    const draft = createCheckoutDraftFromAppointment(appointment, safeStoreItems);
    setLineItems(
      draft.lineItems.map((item, index) => ({
        ...item,
        lineKey: `seed-${index}`,
        locked: item.itemType === 'service',
      }))
    );
    setDiscountAmount(String(draft.discountAmount));
    setAdjustmentAmount(String(draft.adjustmentAmount));
    setPaymentMethod(draft.paymentMethod ?? 'cash');
    setNote(draft.note ?? '');
    setSelectedProductId(productItems[0]?.id ?? '');
    setSelectedQuantity('1');
  }, [appointment, isOpen, productItems, safeStoreItems]);

  const subtotal = useMemo(() => calculateCheckoutSubtotal(lineItems), [lineItems]);
  const discountValue = Number(discountAmount) || 0;
  const adjustmentValue = Number(adjustmentAmount) || 0;
  const totalAmount = useMemo(
    () => calculateCheckoutTotal(subtotal, discountValue, adjustmentValue),
    [adjustmentValue, discountValue, subtotal]
  );

  const handleAddProduct = () => {
    const product = productItems.find((item) => item.id === selectedProductId);
    if (!product) {
      return;
    }

    const quantity = Math.max(1, Number(selectedQuantity) || 1);

    setLineItems((current) => {
      const existingIndex = current.findIndex(
        (entry) => entry.itemType === 'product' && entry.itemId === product.id
      );

      if (existingIndex >= 0) {
        return current.map((entry, index) => {
          if (index !== existingIndex) {
            return entry;
          }

          const nextQuantity = entry.quantity + quantity;
          return {
            ...entry,
            quantity: nextQuantity,
            totalPrice: product.price * nextQuantity,
          };
        });
      }

      return [
        ...current,
        {
          lineKey: `product-${product.id}`,
          itemId: product.id,
          itemName: product.name,
          itemType: 'product',
          quantity,
          unitPrice: product.price,
          totalPrice: product.price * quantity,
        },
      ];
    });

    setSelectedQuantity('1');
  };

  const handleRemoveLineItem = (lineKey: string) => {
    setLineItems((current) => current.filter((entry) => entry.lineKey !== lineKey));
  };

  const handleProductQuantityChange = (lineKey: string, value: string) => {
    const nextQuantity = Math.max(1, Number(value) || 1);

    setLineItems((current) =>
      current.map((entry) =>
        entry.lineKey !== lineKey || entry.itemType !== 'product'
          ? entry
          : {
              ...entry,
              quantity: nextQuantity,
              totalPrice: entry.unitPrice * nextQuantity,
            }
      )
    );
  };

  const handleConfirm = () => {
    if (!appointment || lineItems.length === 0 || isSaving) {
      return;
    }

    onConfirm({
      clientId: appointment.clientId ?? '',
      clientName: appointment.clientName,
      appointmentId: appointment.id,
      dateStr: appointment.dateStr,
      lineItems: lineItems.map(({ lineKey, locked, ...entry }) => sanitizeCheckoutLineItem(entry)),
      subtotal,
      discountAmount: Math.max(0, discountValue),
      adjustmentAmount: adjustmentValue,
      totalAmount,
      paymentMethod,
      ...(note.trim() ? { note: note.trim() } : {}),
      status: 'completed',
    });
  };

  if (!shouldRender || !appointment) {
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
        className={`${modalShell.panel} ${modalShell.centeredPanel} flex w-full max-w-3xl flex-col overflow-y-auto rounded-[32px] border border-[#E6DED2] bg-[#FFFCF7] p-6 md:p-8 ${modalAnimation.base} ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E8E1D6] pb-5">
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-[0.34em] text-[#8C7A6B]">
              完成結帳
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-[#4A3B32] md:text-4xl">
              {appointment.clientName}
            </div>
            <div className="mt-2 text-sm font-bold text-[#8C7A6B]">
              {appointment.dateStr} {appointment.time} ・ {appointment.service}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border border-[#E6DED2] bg-white p-2 text-[#6F6257] ${interactionMotion.subtleButton}`}
            aria-label="關閉結帳視窗"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <section className="rounded-[24px] border border-[#E6DED2] bg-[#F8F4EC] p-5">
            <div className="text-xs font-bold tracking-[0.28em] text-[#8C7A6B]">預約摘要</div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#4A3B32]">
                顧客：{appointment.clientName}
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#4A3B32]">
                日期：{appointment.dateStr}
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#4A3B32]">
                時間：{appointment.time}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.28em] text-[#8C7A6B]">結帳明細</div>
                <div className="mt-1 text-sm font-bold text-[#4A3B32]">
                  服務預設已帶入，可再加商品
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.lineKey}
                  className="rounded-[22px] border border-[#E6DED2] bg-[#FCFAF5] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-lg font-black text-[#4A3B32]">
                          {item.itemName}
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#8C7A6B]">
                          {item.itemType === 'service' ? '服務' : '商品'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-bold text-[#8C7A6B]">
                        單價 {item.unitPrice} ・ 小計 {item.totalPrice}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:justify-end">
                      {item.itemType === 'product' ? (
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            handleProductQuantityChange(item.lineKey, event.target.value)
                          }
                          className="w-24 rounded-2xl border border-[#E2DCD0] bg-white px-4 py-3 text-center text-base font-black text-[#4A3B32] outline-none focus:border-[#4A3B32]"
                        />
                      ) : (
                        <div className="rounded-2xl border border-[#E2DCD0] bg-white px-4 py-3 text-base font-black text-[#4A3B32]">
                          x {item.quantity}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.lineKey)}
                        disabled={Boolean(item.locked) || isSaving}
                        className={`rounded-full border border-[#E6DED2] bg-white p-3 text-[#A85145] disabled:cursor-not-allowed disabled:opacity-40 ${interactionMotion.subtleButton}`}
                        aria-label={`移除 ${item.itemName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E6DED2] bg-[#F8F4EC] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                  加入商品
                </label>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="w-full cursor-pointer rounded-2xl border border-[#E2DCD0] bg-white px-5 py-4 text-base font-bold text-[#4A3B32] outline-none"
                >
                  {productItems.length === 0 ? (
                    <option value="">目前沒有商品可加入</option>
                  ) : (
                    productItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ・ {item.price}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="w-full md:w-32">
                <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                  數量
                </label>
                <input
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={(event) => setSelectedQuantity(event.target.value)}
                  className="w-full rounded-2xl border border-[#E2DCD0] bg-white px-4 py-4 text-center text-base font-black text-[#4A3B32] outline-none focus:border-[#4A3B32]"
                />
              </div>

              <button
                type="button"
                onClick={handleAddProduct}
                disabled={productItems.length === 0 || !selectedProductId || isSaving}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4A3B32] px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.button}`}
              >
                <Plus className="h-4 w-4" />
                加入商品
              </button>
            </div>

            {productItems.length === 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#8C7A6B]">
                <ShoppingBag className="h-4 w-4" />
                目前商品主檔為空，這一筆只會記錄服務結帳。
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                折扣
              </label>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-black text-[#4A3B32] outline-none focus:border-[#4A3B32]"
              />
            </div>
            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                調整金額
              </label>
              <input
                type="number"
                value={adjustmentAmount}
                onChange={(event) => setAdjustmentAmount(event.target.value)}
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-black text-[#4A3B32] outline-none focus:border-[#4A3B32]"
              />
            </div>
            <div>
              <label className="mb-3 block text-base font-bold tracking-widest text-[#6B5A4E]">
                付款方式
              </label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                className="w-full cursor-pointer rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-5 text-xl font-black text-[#4A3B32] outline-none"
              >
                <option value="cash">現金</option>
                <option value="card">刷卡</option>
                <option value="transfer">轉帳</option>
                <option value="other">其他</option>
              </select>
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
                placeholder="可補充折扣原因或商品說明"
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E6DED2] bg-[#4A3B32] p-5 text-[#FCFAF5]">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs font-bold tracking-[0.28em] text-[#D9C8B4]">小計</div>
                <div className="mt-2 text-2xl font-black">{subtotal}</div>
              </div>
              <div>
                <div className="text-xs font-bold tracking-[0.28em] text-[#D9C8B4]">折扣 / 調整</div>
                <div className="mt-2 text-2xl font-black">-{Math.max(0, discountValue)} / {adjustmentValue}</div>
              </div>
              <div>
                <div className="text-xs font-bold tracking-[0.28em] text-[#D9C8B4]">實收總額</div>
                <div className="mt-2 text-3xl font-black">{totalAmount}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={lineItems.length === 0 || isSaving}
            className={`w-full rounded-2xl bg-[#A85145] py-5 text-xl font-black text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.button}`}
          >
            {isSaving ? '結帳儲存中...' : '完成結帳'}
          </button>
        </div>
      </div>
    </div>
  );
};