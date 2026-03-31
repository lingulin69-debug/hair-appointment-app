import React from 'react';
import { X } from 'lucide-react';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempClientData: {
    id?: string;
    name: string;
    phone: string;
    preference: string;
    product: string;
  };
  setTempClientData: (data: {
    id?: string;
    name: string;
    phone: string;
    preference: string;
    product: string;
  }) => void;
  onSave: () => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  tempClientData,
  setTempClientData,
  onSave,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);
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
        className={`${modalShell.panel} ${modalShell.centeredPanel} ${modalAnimation.base} flex max-w-lg flex-col p-8 md:p-12 ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="mb-8 flex items-center justify-between border-b border-[#E2DCD0] pb-6">
          <h2 className="text-4xl font-black tracking-widest text-[#4A3B32]">
            {tempClientData.id ? '編輯顧客' : '新增顧客'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 hover:bg-[#F4F0EA] ${interactionMotion.subtleButton}`}
            aria-label="關閉顧客視窗"
          >
            <X className="h-5 w-5 text-[#8C7A6B]" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto pr-2">
          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              姓名 NAME
            </label>
            <input
              type="text"
              value={tempClientData.name}
              onChange={(event) =>
                setTempClientData({ ...tempClientData, name: event.target.value })
              }
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-2xl font-black text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              電話 PHONE
            </label>
            <input
              type="tel"
              value={tempClientData.phone}
              onChange={(event) =>
                setTempClientData({ ...tempClientData, phone: event.target.value })
              }
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-xl font-bold text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              喜好 PREFERENCE
            </label>
            <textarea
              value={tempClientData.preference}
              onChange={(event) =>
                setTempClientData({
                  ...tempClientData,
                  preference: event.target.value,
                })
              }
              className="min-h-[140px] w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-lg font-bold text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              慣用商品 PRODUCT
            </label>
            <textarea
              value={tempClientData.product}
              onChange={(event) =>
                setTempClientData({ ...tempClientData, product: event.target.value })
              }
              className="min-h-[100px] w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-lg font-bold text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4 border-t border-[#E2DCD0] pt-8">
          <button
            type="button"
            onClick={onSave}
            disabled={!tempClientData.name.trim()}
            className={`w-full rounded-2xl bg-[#4A3B32] py-5 text-xl font-black tracking-widest text-white shadow-md disabled:opacity-50 disabled:hover:translate-y-0 ${interactionMotion.button}`}
          >
            儲存顧客資料
          </button>
        </div>
      </div>
    </div>
  );
};
