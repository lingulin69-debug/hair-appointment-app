import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarOff, ChevronDown, Trash2, X } from 'lucide-react';
import type { Appointment } from '../../types';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onCancelAppointment: (appointment: Appointment) => void | Promise<void>;
  onDeleteAppointment: (appointment: Appointment) => void | Promise<void>;
}

type DetailRowProps = {
  label: string;
  value?: string | number;
  fallback: string;
};

function DetailRow({ label, value, fallback }: DetailRowProps) {
  return (
    <div className="rounded-[22px] border border-[#E6DED2] bg-[#F8F4EC] px-5 py-4">
      <div className="text-xs font-bold tracking-[0.28em] text-[#8C7A6B]">
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap text-base font-semibold leading-7 text-[#4A3B32]">
        {value || fallback}
      </div>
    </div>
  );
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onCancelAppointment,
  onDeleteAppointment,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setConfirmDelete(false);
  }, [isOpen]);

  const checkScroll = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  }, []);

  useEffect(() => {
    if (!shouldRender) return;
    const timer = setTimeout(checkScroll, 100);
    return () => clearTimeout(timer);
  }, [shouldRender, checkScroll]);

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
        ref={panelRef}
        onScroll={checkScroll}
        className={`${modalShell.panel} ${modalShell.centeredPanel} w-full max-w-2xl overflow-y-auto rounded-[32px] border border-[#E6DED2] bg-[#FFFCF7] p-6 md:p-8 ${modalAnimation.base} ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E8E1D6] pb-5">
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-[0.34em] text-[#8C7A6B]">
              預約詳情
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-[#4A3B32] md:text-4xl">
              {appointment.clientName}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border border-[#E6DED2] bg-white p-2 text-[#6F6257] ${interactionMotion.subtleButton}`}
            aria-label="關閉預約詳情"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <DetailRow label="日期 DATE" value={appointment.dateStr} fallback="無" />
          <DetailRow label="時間 TIME" value={appointment.time} fallback="無" />
          <DetailRow label="服務項目 SERVICE" value={appointment.service} fallback="未指定" />
          <DetailRow label="人數 PAX" value={appointment.pax} fallback="1" />
          <DetailRow label="總金額 PRICE" value={`$${appointment.totalPrice}`} fallback="無" />
           <DetailRow
            label="備註 NOTES"
            value={appointment.notes}
            fallback="無"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#E8E1D6] pt-5 md:flex-row md:justify-end">
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E6DED2] bg-white px-5 py-3 text-sm font-bold text-[#6F6257] ${interactionMotion.button}`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => onDeleteAppointment(appointment)}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D32F2F] px-5 py-3 text-sm font-bold text-white ${interactionMotion.button}`}
              >
                <Trash2 className="h-4 w-4" />
                確認刪除
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E6DED2] bg-white px-5 py-3 text-sm font-bold text-[#D32F2F] ${interactionMotion.button}`}
              >
                <Trash2 className="h-4 w-4" />
                刪除預約
              </button>
              <button
                type="button"
                onClick={() => onCancelAppointment(appointment)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#A85145] px-5 py-3 text-sm font-bold text-white ${interactionMotion.button}`}
          >
            <CalendarOff className="h-4 w-4" />
            取消此預約
          </button>
            </>
          )}
        </div>

        {canScrollDown && (
          <div className="pointer-events-none sticky bottom-0 left-0 right-0 flex justify-center pb-1">
            <div className="animate-bounce rounded-full bg-[#4A3B32]/10 p-1">
              <ChevronDown className="h-4 w-4 text-[#8C7A6B]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
