import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment, StoreItem } from '../../types';
import { formatDateString, groupAppointmentsByDate } from '../../utils/schedule';

export type ScheduleDensity = 'compact' | 'normal' | 'focus';

interface MultiDayScheduleProps {
  currentDate: Date;
  appointments: Appointment[];
  leaveSet: Set<string>;
  storeItems?: StoreItem[] | null;
  density: ScheduleDensity;
  onCurrentDateChange?: (date: Date) => void;
  onAddAppt?: (date: string, initialTime?: string) => void;
  onSelectAppt?: (appointment: Appointment) => void;
  onDateClick?: (date: string) => void;
}

const DAYS_OF_WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const DISPLAY_START_HOUR = 8;
const DISPLAY_END_HOUR = 24;
const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_DURATION_MINUTES = 60;
const DENSITY_CONFIG: Record<
  ScheduleDensity,
  { columnWidth: number; rowHeight: number; blockPadding: number }
> = {
  compact: { columnWidth: 88, rowHeight: 28, blockPadding: 4 },
  normal: { columnWidth: 112, rowHeight: 72, blockPadding: 6 },
  focus: { columnWidth: 140, rowHeight: 48, blockPadding: 8 },
};
function formatClock(totalMinutes: number): string {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const SLOT_RANGES = Array.from(
  { length: ((DISPLAY_END_HOUR - DISPLAY_START_HOUR) * 60) / SLOT_INTERVAL_MINUTES },
  (_, index) => {
    const startMinutes = DISPLAY_START_HOUR * 60 + index * SLOT_INTERVAL_MINUTES;
    const endMinutes = startMinutes + SLOT_INTERVAL_MINUTES;
    const start = formatClock(startMinutes);
    const end = formatClock(endMinutes);

    return {
      start,
      end,
      label: `${start}-${end}`,
      endsAtHour: end.endsWith(':00'),
    };
  }
);
const APPOINTMENT_TONES = [
  {
    surface: 'bg-[#F4A7A7] border-[#E48C8C]',
    text: 'text-[#6B2E2E]',
  },
  {
    surface: 'bg-[#F6C384] border-[#E8AE62]',
    text: 'text-[#6B4720]',
  },
  {
    surface: 'bg-[#9FD8D1] border-[#7BC2BA]',
    text: 'text-[#1E5550]',
  },
  {
    surface: 'bg-[#A7C8F2] border-[#85B1E8]',
    text: 'text-[#24486E]',
  },
  {
    surface: 'bg-[#C8B3F2] border-[#AA92E6]',
    text: 'text-[#4B3275]',
  },
];

function normalizeServiceName(value: string): string {
  return value.replace(/\s+/g, '').toLocaleLowerCase('zh-TW');
}

function parseDurationMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLocaleLowerCase('zh-TW');
  if (!normalized) {
    return null;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Math.round(Number(normalized));
  }

  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(hr|hour|hours|h|小時|小时)/);
  if (hourMatch) {
    return Math.round(Number(hourMatch[1]) * 60);
  }

  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes|分鐘|分)/);
  if (minuteMatch) {
    return Math.round(Number(minuteMatch[1]));
  }

  return null;
}

function resolveDurationFromServiceName(
  serviceName: string,
  serviceItems: StoreItem[]
): number | null {
  if (!serviceName.trim()) {
    return null;
  }

  const normalizedService = normalizeServiceName(serviceName);
  const exactMatch = serviceItems.find(
    (item) => normalizeServiceName(item.name) === normalizedService
  );
  if (exactMatch) {
    return parseDurationMinutes(exactMatch.duration);
  }

  const serviceParts = serviceName
    .split(/[+＋/、,，]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (serviceParts.length === 0) {
    return null;
  }

  const matchedDurations = serviceParts
    .map((part) => {
      const normalizedPart = normalizeServiceName(part);
      const matchedItem = serviceItems.find(
        (item) => normalizeServiceName(item.name) === normalizedPart
      );
      return matchedItem ? parseDurationMinutes(matchedItem.duration) : null;
    })
    .filter((duration): duration is number => typeof duration === 'number' && duration > 0);

  if (matchedDurations.length === serviceParts.length && matchedDurations.length > 0) {
    return matchedDurations.reduce((total, duration) => total + duration, 0);
  }

  return null;
}

function getAppointmentDurationMinutes(
  appointment: Appointment,
  storeItems: StoreItem[]
): number {
  const serviceItems = storeItems.filter((item) => item.type === 'service');
  const resolvedDuration = resolveDurationFromServiceName(
    appointment.service,
    serviceItems
  );

  return Math.max(SLOT_INTERVAL_MINUTES, resolvedDuration ?? DEFAULT_DURATION_MINUTES);
}

function getTimeOffsetUnits(time: string): number | null {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes >= DISPLAY_END_HOUR * 60) {
    return null;
  }

  return Math.max(0, (totalMinutes - DISPLAY_START_HOUR * 60) / SLOT_INTERVAL_MINUTES);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function getColorLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function resolveServiceColor(serviceName: string, serviceItems: StoreItem[]): string | null {
  const normalizedName = normalizeServiceName(serviceName);
  const exact = serviceItems.find((item) => normalizeServiceName(item.name) === normalizedName);
  if (exact?.color) return exact.color;

  const parts = serviceName.split(/[+＋/、,，]/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const match = serviceItems.find(
      (item) => normalizeServiceName(item.name) === normalizeServiceName(part)
    );
    if (match?.color) return match.color;
  }
  return null;
}

function getAppointmentTone(appointment: Appointment) {
  const seed = `${appointment.clientName}${appointment.service}${appointment.dateStr}`
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0);

  return APPOINTMENT_TONES[seed % APPOINTMENT_TONES.length];
}

function formatJumpDateLabel(dateStr: string): string {
  const parsedDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return '選擇日期';
  }

  return `${parsedDate.getFullYear()}/${String(parsedDate.getMonth() + 1).padStart(2, '0')}/${String(
    parsedDate.getDate()
  ).padStart(2, '0')}`;
}

function formatPickerMonthTitle(displayDate: Date): string {
  return `${displayDate.getFullYear()}年${String(displayDate.getMonth() + 1).padStart(2, '0')}月`;
}

function buildPickerDays(displayDate: Date, selectedDate: string) {
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstDayOfMonth.getDay());
  const todayStr = formatDateString(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index
    );
    const dateStr = formatDateString(date);

    return {
      dateStr,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    };
  });
}

export const MultiDaySchedule: React.FC<MultiDayScheduleProps> = ({
  currentDate,
  appointments,
  leaveSet,
  storeItems = [],
  density,
  onCurrentDateChange,
  onAddAppt,
  onSelectAppt,
  onDateClick,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const safeStoreItems = Array.isArray(storeItems) ? storeItems : [];
  const densityConfig = DENSITY_CONFIG[density];
  const columnHeight = SLOT_RANGES.length * densityConfig.rowHeight;
  const groupedAppointments = useMemo(
    () => groupAppointmentsByDate(appointments),
    [appointments]
  );

  const monthDates = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDateString(new Date());

    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(year, month, index + 1);
      const dateStr = formatDateString(date);

      return {
        dateStr,
        dayNumber: index + 1,
        weekday: DAYS_OF_WEEK[date.getDay()],
        isToday: dateStr === todayStr,
        isLeave: leaveSet.has(dateStr),
        appointments: (groupedAppointments[dateStr] ?? []).slice().sort((left, right) =>
          left.time.localeCompare(right.time)
        ),
      };
    });
  }, [currentDate, groupedAppointments, leaveSet]);

  const defaultJumpDate = useMemo(() => {
    const todayStr = formatDateString(new Date());
    return monthDates.some((date) => date.dateStr === todayStr)
      ? todayStr
      : monthDates[0]?.dateStr ?? formatDateString(currentDate);
  }, [currentDate, monthDates]);
  const [jumpDate, setJumpDate] = useState(defaultJumpDate);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMonthDate, setPickerMonthDate] = useState(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  );

  const jumpDateLabel = useMemo(() => formatJumpDateLabel(jumpDate), [jumpDate]);
  const pickerMonthTitle = useMemo(
    () => formatPickerMonthTitle(pickerMonthDate),
    [pickerMonthDate]
  );
  const pickerDays = useMemo(
    () => buildPickerDays(pickerMonthDate, jumpDate),
    [pickerMonthDate, jumpDate]
  );

  const timeLabelClass =
    density === 'compact'
      ? 'text-[18px]'
      : density === 'normal'
        ? 'text-[19px]'
        : 'text-[21px]';
  const clientLabelClass =
    density === 'compact'
      ? 'text-[16px] leading-5'
      : density === 'normal'
        ? 'text-[17px] leading-5'
        : 'text-[18px] leading-6';
  const serviceLabelClass =
    density === 'compact'
      ? 'text-[15px] leading-5'
      : density === 'normal'
        ? 'text-[16px] leading-5'
        : 'text-[17px] leading-6';

  const scrollToDate = (dateStr: string, behavior: ScrollBehavior = 'smooth') => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const targetIndex = monthDates.findIndex((date) => date.dateStr === dateStr);
    if (targetIndex < 0) {
      return;
    }

    const left = Math.max(targetIndex * densityConfig.columnWidth - densityConfig.columnWidth, 0);
    viewport.scrollTo({ left, behavior });
  };

  useEffect(() => {
    const currentMonthPrefix = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, '0')}`;

    if (!jumpDate.startsWith(currentMonthPrefix)) {
      setJumpDate(defaultJumpDate);
    }
  }, [currentDate, defaultJumpDate, jumpDate]);

  useEffect(() => {
    const parsedJumpDate = new Date(`${jumpDate}T00:00:00`);
    if (!Number.isNaN(parsedJumpDate.getTime())) {
      setPickerMonthDate(new Date(parsedJumpDate.getFullYear(), parsedJumpDate.getMonth(), 1));
      return;
    }

    setPickerMonthDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  }, [currentDate, jumpDate]);

  useEffect(() => {
    if (monthDates.length === 0) {
      return;
    }

    const preferredDate = monthDates.some((date) => date.dateStr === jumpDate)
      ? jumpDate
      : defaultJumpDate;
    scrollToDate(preferredDate, 'smooth');
  }, [defaultJumpDate, densityConfig.columnWidth, jumpDate, monthDates]);

  useEffect(() => {
    if (!isDatePickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (pickerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsDatePickerOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDatePickerOpen]);

  const handleJumpDateSelect = (value: string) => {
    setJumpDate(value);
    if (!value) {
      return;
    }

    setIsDatePickerOpen(false);

    onDateClick?.(value);
    const parsedDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      return;
    }

    setPickerMonthDate(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));

    const monthChanged =
      parsedDate.getFullYear() !== currentDate.getFullYear() ||
      parsedDate.getMonth() !== currentDate.getMonth();

    if (monthChanged) {
      onCurrentDateChange?.(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
      return;
    }

    scrollToDate(value, 'smooth');
  };

  const toggleDatePicker = () => {
    setIsDatePickerOpen((isOpen) => !isOpen);
  };

  const movePickerMonth = (offset: number) => {
    setPickerMonthDate(
      (previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1)
    );
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 md:px-6 md:pb-6">
      <div className="relative z-30 overflow-visible rounded-[26px] border border-[#E8E3D8] bg-[#FFFDFC] p-4 shadow-[0_14px_30px_rgba(74,59,50,0.05)] md:p-5">
        <div className="text-xs font-bold tracking-[0.28em] text-[#8C7A6B]">月排程</div>
        <div className="mt-2 text-sm font-semibold text-[#6F6257] md:text-base">
          整月可左右拖動日期、上下瀏覽 08:00-24:00 時段。空白格就是可安排空檔。
        </div>

        <div ref={pickerRef} className="relative z-40 mt-4 flex flex-wrap items-center gap-3">
          <label
            className="text-xs font-bold tracking-[0.24em] text-[#8C7A6B]"
          >
            日期跳轉
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={toggleDatePicker}
              aria-label="日期跳轉"
              aria-haspopup="dialog"
              aria-expanded={isDatePickerOpen}
              className="flex min-w-[176px] items-center justify-between gap-3 rounded-[6px] border border-[#D8D2C8] bg-[#FBFAF7] px-4 py-2 text-sm font-semibold text-[#4A3B32] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_3px_rgba(74,59,50,0.08)] outline-none transition-colors hover:border-[#BCAFA0]"
            >
              <span className="flex-1 text-center">{jumpDateLabel}</span>
              <ChevronDown
                className={`h-4 w-4 text-[#8C7A6B] transition-transform ${
                  isDatePickerOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDatePickerOpen && (
              <div
                role="dialog"
                aria-label="日期跳轉選單"
                className="absolute left-1/2 top-[calc(100%+10px)] z-[80] w-[304px] -translate-x-1/2 overflow-hidden rounded-[6px] border border-[#D8D2C8] bg-[#FBFAF7] shadow-[0_18px_36px_rgba(74,59,50,0.18)]"
              >
                <div className="flex items-center justify-between border-b border-[#E3DDD2] px-3 py-3">
                  <div className="text-[18px] font-black text-[#2F3A4A]">{pickerMonthTitle}</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => movePickerMonth(-1)}
                      aria-label="上一個月"
                      className="rounded-full p-1.5 text-[#5D6B7A] transition-colors hover:bg-[#EEF3F9]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePickerMonth(1)}
                      aria-label="下一個月"
                      className="rounded-full p-1.5 text-[#5D6B7A] transition-colors hover:bg-[#EEF3F9]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-b border-[#EDE7DC] px-3 py-2 text-center text-[13px] font-bold tracking-[0.18em] text-[#8C7A6B]">
                  {DAYS_OF_WEEK.map((weekday) => (
                    <div key={weekday}>{weekday}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1 px-2 py-3">
                  {pickerDays.map((date) => {
                    const dayButtonClass = date.isSelected
                      ? 'bg-[#0A84FF] text-white shadow-[0_8px_14px_rgba(10,132,255,0.26)]'
                      : date.isToday
                        ? 'border border-[#0A84FF] text-[#0A84FF]'
                        : date.isCurrentMonth
                          ? 'text-[#2F3A4A] hover:bg-[#EEF3F9]'
                          : 'text-[#B0A79B] hover:bg-[#F4EFE7]';

                    return (
                      <button
                        key={date.dateStr}
                        type="button"
                        onClick={() => handleJumpDateSelect(date.dateStr)}
                        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-[6px] text-[16px] font-bold transition-colors ${dayButtonClass}`}
                      >
                        {date.dayNumber}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-[#E3DDD2] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleJumpDateSelect(defaultJumpDate)}
                    className="text-[15px] font-bold text-[#0A84FF] transition-opacity hover:opacity-75"
                  >
                    清除
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJumpDateSelect(formatDateString(new Date()))}
                    className="text-[15px] font-bold text-[#0A84FF] transition-opacity hover:opacity-75"
                  >
                    今天
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="text-xs font-semibold text-[#8C7A6B] md:text-sm">
            選日期後會直接跳到該日欄位
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative z-10 overflow-x-auto rounded-[28px] border border-[#E8E3D8] bg-[#FCFAF5] shadow-[0_14px_28px_rgba(74,59,50,0.04)]"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div className="min-w-max">
          <div className="sticky top-0 z-20 flex bg-[#FCFAF5]/95 backdrop-blur-sm">
            {monthDates.map((date) => (
              <button
                key={date.dateStr}
                type="button"
                onClick={() => {
                  setJumpDate(date.dateStr);
                  onDateClick?.(date.dateStr);
                  scrollToDate(date.dateStr, 'smooth');
                }}
                className={`shrink-0 border-b border-r border-[#E8E3D8] px-2 py-3 text-center transition-colors ${
                  date.isLeave ? 'bg-[#F8F2E8]' : 'bg-[#FCFAF5] hover:bg-[#F7F1E8]'
                }`}
                style={{ width: densityConfig.columnWidth }}
              >
                <div className="text-xl font-black leading-none text-[#4A3B32]">
                  {String(date.dayNumber).padStart(2, '0')}
                </div>
                <div className="mt-1 text-[13px] font-bold tracking-[0.2em] text-[#8C7A6B]">
                  {date.weekday}
                </div>
                {date.isToday && (
                  <div className="mt-2 inline-flex rounded-full bg-[#4A3B32] px-2 py-1 text-[12px] font-bold text-white">
                    TODAY
                  </div>
                )}
                {date.isLeave && (
                  <div className="mt-2 inline-flex rounded-full border border-[#C75D4E] px-2 py-1 text-[12px] font-bold text-[#C75D4E]">
                    休假
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex">
            {monthDates.map((date) => (
              <div
                key={`${date.dateStr}-column`}
                className="relative shrink-0 border-r border-[#E8E3D8]"
                style={{ width: densityConfig.columnWidth, height: columnHeight }}
              >
                <div
                  className={`absolute inset-0 grid ${
                    date.isLeave ? 'bg-[#F8F2E8]' : 'bg-[#FFFDFC]'
                  }`}
                  style={{
                    gridTemplateRows: `repeat(${SLOT_RANGES.length}, minmax(${densityConfig.rowHeight}px, ${densityConfig.rowHeight}px))`,
                  }}
                >
                  {SLOT_RANGES.map((slotRange) => (
                    <button
                      key={`${date.dateStr}-${slotRange.start}`}
                      type="button"
                      onClick={() => {
                        setJumpDate(date.dateStr);
                        onDateClick?.(date.dateStr);
                        onAddAppt?.(date.dateStr, slotRange.start);
                      }}
                      disabled={date.isLeave}
                      aria-label={`${date.dateStr} ${slotRange.start} 新增預約`}
                      className={`relative border-b px-0 transition-colors ${
                        slotRange.endsAtHour
                          ? 'border-[#D8CAB7]'
                          : 'border-dashed border-[#EEE6DA]'
                      } ${
                        date.isLeave
                          ? 'cursor-not-allowed bg-[#F8F2E8]'
                          : 'bg-transparent hover:bg-[#F7F1E8]'
                      }`}
                    >
                      {slotRange.start.endsWith(':00') && (
                        <span className="pointer-events-none absolute left-2 top-1 text-[16px] font-semibold text-[#B7AA9A]">
                          {slotRange.start}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {date.isLeave && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#F8F2E8]/75">
                    <div className="rounded-full border border-[#C75D4E] bg-white/90 px-3 py-1.5 text-xs font-bold tracking-[0.2em] text-[#C75D4E]">
                      本日休假
                    </div>
                  </div>
                )}

                {date.appointments.map((appointment) => {
                  const startOffsetUnits = getTimeOffsetUnits(appointment.time);
                  if (startOffsetUnits === null) {
                    return null;
                  }

                  const durationMinutes = getAppointmentDurationMinutes(
                    appointment,
                    safeStoreItems
                  );
                  const visibleUnits = Math.min(
                    durationMinutes / SLOT_INTERVAL_MINUTES,
                    SLOT_RANGES.length - startOffsetUnits
                  );
                  if (visibleUnits <= 0) {
                    return null;
                  }

                  const tone = getAppointmentTone(appointment);
                  const serviceColor = resolveServiceColor(
                    appointment.service,
                    safeStoreItems.filter((item) => item.type === 'service')
                  );
                  const rgb = serviceColor ? hexToRgb(serviceColor) : null;
                  const luminance = rgb ? getColorLuminance(rgb.r, rgb.g, rgb.b) : null;
                  const customTextColor = luminance !== null ? (luminance > 150 ? '#4A3B32' : '#FAFAFA') : null;
                  const toneClasses = serviceColor ? '' : `${tone.surface} ${tone.text}`;
                  const top = startOffsetUnits * densityConfig.rowHeight + 2;
                  const height = Math.max(
                    densityConfig.rowHeight - 4,
                    visibleUnits * densityConfig.rowHeight - 4
                  );
                  const canShowService = height >= densityConfig.rowHeight * 2;
                  const blockStyle: React.CSSProperties = {
                    top,
                    height,
                    left: densityConfig.blockPadding,
                    right: densityConfig.blockPadding,
                    ...(serviceColor && {
                      backgroundColor: serviceColor,
                      borderColor: 'rgba(0,0,0,0.15)',
                      color: customTextColor ?? '#4A3B32',
                    }),
                  };

                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => onSelectAppt?.(appointment)}
                      aria-label={`${appointment.dateStr} ${appointment.time} ${appointment.clientName} ${appointment.service}`}
                className={`absolute left-1 right-1 z-10 flex flex-col items-center justify-center overflow-hidden rounded-[18px] border-2 px-2 py-1.5 text-center shadow-[0_10px_18px_rgba(74,59,50,0.12)] transition-transform hover:-translate-y-0.5 ${toneClasses}`}
                      style={blockStyle}
                    >
                      <div className={`${timeLabelClass} font-black tracking-[0.12em]`}>
                        {appointment.time}
                      </div>
                      <div className={`mt-1 line-clamp-2 font-bold ${clientLabelClass}`}>
                        {appointment.clientName}
                      </div>
                      {canShowService && (
                        <div className={`mt-1 line-clamp-2 font-semibold opacity-90 ${serviceLabelClass}`}>
                          {appointment.service}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};