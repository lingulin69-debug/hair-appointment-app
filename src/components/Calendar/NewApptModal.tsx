import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Appointment, Client, StoreItem } from '../../types';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';
import { isExactDateString } from '../../utils/schedule';

interface NewApptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateStr: string;
  clients?: Client[] | null;
  tempClientName: string;
  setTempClientName: (name: string) => void;
  tempPhone: string;
  setTempPhone: (phone: string) => void;
  tempTime: string;
  setTempTime: (time: string) => void;
  tempService: string;
  setTempService: (service: string) => void;
  tempPrice: number;
  setTempPrice: (price: number) => void;
  tempPax: number;
  setTempPax: (pax: number) => void;
  tempNotes: string;
  setTempNotes: (notes: string) => void;
  typingMatchedClient: Client | null;
  clientSuggestions?: Client[] | null;
  onSelectClientSuggestion: (client: Client) => void;
  appointments?: Appointment[] | null;
  storeItems?: StoreItem[] | null;
  isClientsLoading?: boolean;
  isStoreItemsLoading?: boolean;
  onSave: () => void;
}

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, index) =>
  String(index + 8).padStart(2, '0')
);
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

function formatTime(hour: string, minute: string) {
  return `${hour}:${minute}`;
}

export const NewApptModal: React.FC<NewApptModalProps> = ({
  isOpen,
  onClose,
  selectedDateStr,
  clients = [],
  tempClientName,
  setTempClientName,
  tempPhone,
  setTempPhone,
  tempTime,
  setTempTime,
  tempService,
  setTempService,
  tempPrice,
  setTempPrice,
  tempPax,
  setTempPax,
  tempNotes,
  setTempNotes,
  typingMatchedClient,
  clientSuggestions = [],
  onSelectClientSuggestion,
  appointments = [],
  storeItems = [],
  isClientsLoading = false,
  isStoreItemsLoading = false,
  onSave,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);

  const safeClients = Array.isArray(clients) ? clients : [];
  const safeClientSuggestions = Array.isArray(clientSuggestions)
    ? clientSuggestions
    : [];
  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const safeStoreItems = Array.isArray(storeItems) ? storeItems : [];
  const hasValidSelectedDate = isExactDateString(selectedDateStr);
  const serviceOptions = safeStoreItems.filter((item) => item.type === 'service');
  const showSuggestions =
    tempClientName.trim().length > 0 && safeClientSuggestions.length > 0;
  const isClientsDataLoading = isClientsLoading && safeClients.length === 0;
  const isServicesDataLoading =
    isStoreItemsLoading && safeStoreItems.length === 0;

  const occupiedTimes = useMemo(() => {
    if (!hasValidSelectedDate || safeAppointments.length === 0) {
      return new Set<string>();
    }

    const sameDayAppointments = safeAppointments.filter(
      (appointment) => appointment.dateStr === selectedDateStr
    );

    if (sameDayAppointments.length === 0) {
      return new Set<string>();
    }

    return new Set(sameDayAppointments.map((appointment) => appointment.time));
  }, [hasValidSelectedDate, safeAppointments, selectedDateStr]);

  const availableTimes = useMemo(
    () =>
      HOUR_OPTIONS.flatMap((hour) =>
        MINUTE_OPTIONS.map((minute) => formatTime(hour, minute))
      ).filter((time) => !occupiedTimes.has(time)),
    [occupiedTimes]
  );

  const [selectedHour = '', selectedMinute = '00'] = (
    tempTime || availableTimes[0] || ''
  ).split(':');

  const hourOptions = useMemo(
    () =>
      HOUR_OPTIONS.map((hour) => ({
        value: hour,
        disabled: MINUTE_OPTIONS.every((minute) =>
          occupiedTimes.has(formatTime(hour, minute))
        ),
      })),
    [occupiedTimes]
  );

  const minuteOptions = useMemo(
    () =>
      MINUTE_OPTIONS.map((minute) => ({
        value: minute,
        disabled:
          !selectedHour || occupiedTimes.has(formatTime(selectedHour, minute)),
      })),
    [occupiedTimes, selectedHour]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (availableTimes.length === 0) {
      if (tempTime) {
        setTempTime('');
      }
      return;
    }

    if (!tempTime || !availableTimes.includes(tempTime)) {
      setTempTime(availableTimes[0]);
    }
  }, [availableTimes, isOpen, setTempTime, tempTime]);

  const handleHourChange = (hour: string) => {
    const nextMinute =
      MINUTE_OPTIONS.find(
        (minute) =>
          minute === selectedMinute && !occupiedTimes.has(formatTime(hour, minute))
      ) ??
      MINUTE_OPTIONS.find(
        (minute) => !occupiedTimes.has(formatTime(hour, minute))
      );

    setTempTime(nextMinute ? formatTime(hour, nextMinute) : '');
  };

  const handleMinuteChange = (minute: string) => {
    if (!selectedHour) {
      return;
    }

    const nextTime = formatTime(selectedHour, minute);
    if (!occupiedTimes.has(nextTime)) {
      setTempTime(nextTime);
    }
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
        className={`${modalShell.panel} ${modalShell.centeredPanel} ${modalAnimation.base} flex max-w-lg flex-col p-8 md:p-12 ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="mb-8 flex shrink-0 items-center justify-between border-b border-[#E2DCD0] pb-6">
          <h2 className="text-4xl font-black tracking-widest text-[#4A3B32]">
            新增預約
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 hover:bg-[#F4F0EA] ${interactionMotion.subtleButton}`}
            aria-label="關閉新增預約視窗"
          >
            <X className="h-5 w-5 text-[#8C7A6B]" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto pr-2">
          {(isClientsDataLoading || isServicesDataLoading) && (
            <div className="space-y-3">
              {isClientsDataLoading && (
                <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-4 py-3 text-sm font-bold text-[#7A6B5D]">
                  顧客資料仍在載入中，可以先輸入姓名。
                </div>
              )}
              {isServicesDataLoading && (
                <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-4 py-3 text-sm font-bold text-[#7A6B5D]">
                  服務資料仍在同步中，視窗會保持開啟。
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              顧客姓名
            </label>
            <div className="relative">
              <input
                type="text"
                value={tempClientName}
                onChange={(event) => setTempClientName(event.target.value)}
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-2xl font-black text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
                placeholder="請輸入顧客姓名"
                autoFocus
              />
              {typingMatchedClient && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-[#4A3B32] px-3 py-1.5 text-xs font-bold tracking-widest text-white shadow-sm">
                  舊客
                </div>
              )}
            </div>

            {showSuggestions && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] shadow-sm">
                {safeClientSuggestions.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => onSelectClientSuggestion(client)}
                    className="flex w-full items-center justify-between gap-3 border-b border-[#EDE6DB] px-4 py-3 text-left transition-colors hover:bg-white last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-[#4A3B32]">
                        {client.name}
                      </div>
                      <div className="truncate text-sm font-medium text-[#8C7A6B]">
                        {client.phone || '尚未填寫電話'}
                      </div>
                    </div>
                    {client.lastVisit && (
                      <span className="shrink-0 rounded-full border border-[#E2DCD0] bg-white px-3 py-1 text-xs font-bold tracking-wide text-[#8C7A6B]">
                        {client.lastVisit}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              電話
            </label>
            <input
              type="tel"
              value={tempPhone}
              onChange={(event) => setTempPhone(event.target.value)}
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-xl font-bold text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
              placeholder="例如：0912-345-678"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
                小時
              </label>
              <select
                value={selectedHour}
                onChange={(event) => handleHourChange(event.target.value)}
                className="w-full cursor-pointer rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-xl font-black text-[#4A3B32] shadow-inner outline-none"
              >
                {hourOptions.map((hour) => (
                  <option
                    key={hour.value}
                    value={hour.value}
                    disabled={hour.disabled}
                  >
                    {hour.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
                分鐘
              </label>
              <select
                value={selectedMinute}
                onChange={(event) => handleMinuteChange(event.target.value)}
                disabled={!selectedHour || availableTimes.length === 0}
                className="w-full cursor-pointer rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-xl font-black text-[#4A3B32] shadow-inner outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {minuteOptions.map((minute) => (
                  <option
                    key={minute.value}
                    value={minute.value}
                    disabled={minute.disabled}
                  >
                    {minute.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
                人數
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={tempPax}
                onChange={(event) =>
                  setTempPax(parseInt(event.target.value, 10) || 1)
                }
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-xl font-black text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
                價格
              </label>
              <input
                type="number"
                min="0"
                value={tempPrice}
                onChange={(event) => setTempPrice(Number(event.target.value) || 0)}
                className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-xl font-black text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
                placeholder="請輸入價格"
              />
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              服務項目
            </label>
            <select
              value={tempService}
              onChange={(event) => {
                const selectedName = event.target.value;
                setTempService(selectedName);

                const selectedItem = serviceOptions.find(
                  (item) => item.name === selectedName
                );

                if (selectedItem) {
                  setTempPrice(selectedItem.price);
                }
              }}
              disabled={isStoreItemsLoading || serviceOptions.length === 0}
              className="w-full cursor-pointer rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-xl font-black text-[#4A3B32] shadow-inner outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStoreItemsLoading ? (
                <option value="">服務資料載入中...</option>
              ) : serviceOptions.length === 0 ? (
                <option value="">目前沒有可用服務</option>
              ) : (
                serviceOptions.map((service) => (
                  <option key={service.id} value={service.name}>
                    {service.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold tracking-widest text-[#8C7A6B]">
              備註
            </label>
            <input
              type="text"
              value={tempNotes}
              onChange={(event) => setTempNotes(event.target.value)}
              className="w-full rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-lg font-bold text-[#4A3B32] shadow-inner outline-none transition-colors focus:border-[#4A3B32] focus:bg-white"
              placeholder="可填寫指定設計師或特殊需求"
            />
          </div>

          <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-4 py-3 text-sm font-bold text-[#7A6B5D]">
            預約日期：{hasValidSelectedDate ? selectedDateStr : '尚未選擇日期'}
          </div>

          {tempClientName.trim() && !typingMatchedClient && (
            <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-4 py-3 text-sm font-bold text-[#7A6B5D]">
              若找不到同名顧客，儲存後會自動建立新的顧客資料。
            </div>
          )}

          {availableTimes.length === 0 && (
            <div className="rounded-2xl border border-[#C75D4E]/30 bg-[#FFF3EE] px-4 py-3 text-sm font-bold text-[#A34B3F]">
              當天所有 15 分鐘時段都已被預約。
            </div>
          )}
        </div>

        <div className="mt-4 shrink-0 border-t border-[#E2DCD0] pt-8">
          <button
            type="button"
            onClick={onSave}
            disabled={
              !tempClientName.trim() ||
              !hasValidSelectedDate ||
              isStoreItemsLoading ||
              serviceOptions.length === 0 ||
              availableTimes.length === 0 ||
              !tempTime
            }
            className={`w-full rounded-2xl bg-[#4A3B32] py-5 text-xl font-black tracking-widest text-white shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${interactionMotion.button}`}
          >
            儲存預約
          </button>
        </div>
      </div>
    </div>
  );
};
