import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarOff, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Appointment, StoreItem } from '../../types';
import { formatDateString, groupAppointmentsByDate } from '../../utils/schedule';
import { MultiDaySchedule, type ScheduleDensity } from './MultiDaySchedule';

interface CalendarProps {
  currentDate: Date;
  appointments?: Appointment[] | null;
  storeItems?: StoreItem[] | null;
  isLoading?: boolean;
  leaveSet: Set<string>;
  onCurrentDateChange?: (date: Date) => void;
  onDateClick?: (date: string) => void;
  onAddAppt?: (date: string, initialTime?: string) => void;
  onSelectAppt?: (appt: Appointment) => void;
  onToggleLeave?: (dateStr: string) => void;
}

const DAYS_OF_WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const MAX_VISIBLE_APPOINTMENTS = 6;
const SLOT_HOURS = Array.from({ length: 16 }, (_, index) =>
  String(index + 8).padStart(2, '0')
);
const SLOT_MINUTES = ['00', '15', '30', '45'];
const TIME_SLOT_OPTIONS = SLOT_HOURS.flatMap((hour) =>
  SLOT_MINUTES.map((minute) => `${hour}:${minute}`)
);
const CALENDAR_VIEW_STORAGE_KEY = 'hair-salon:calendar-view-mode';
const SCHEDULE_DENSITY_STORAGE_KEY = 'hair-salon:schedule-density';

type CalendarViewMode = 'month' | 'schedule';

function getClientBadge(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }

  const firstChar = trimmed[0];
  return /[\u4e00-\u9fff]/.test(firstChar) ? firstChar : firstChar.toUpperCase();
}

function isAppointmentPassed(dateStr: string, time: string): boolean {
  const now = new Date();
  const todayStr = formatDateString(now);
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  const [hours, minutes] = time.split(':').map(Number);
  return hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes());
}

export const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  appointments,
  storeItems,
  isLoading = false,
  leaveSet,
  onCurrentDateChange,
  onDateClick,
  onAddAppt,
  onSelectAppt,
  onToggleLeave,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    if (typeof window === 'undefined') {
      return 'month';
    }

    return window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY) === 'schedule'
      ? 'schedule'
      : 'month';
  });
  const [scheduleDensity, setScheduleDensity] = useState<ScheduleDensity>(() => {
    if (typeof window === 'undefined') {
      return 'normal';
    }

    const savedDensity = window.localStorage.getItem(SCHEDULE_DENSITY_STORAGE_KEY);
    return savedDensity === 'compact' || savedDensity === 'focus' ? savedDensity : 'normal';
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedDatePanelRef = useRef<HTMLDivElement>(null);
  const safeAppointments = useMemo(
    () =>
      (Array.isArray(appointments) ? appointments : []).filter(
        (appointment) => appointment.status !== 'cancelled'
      ),
    [appointments]
  );
  const safeStoreItems = Array.isArray(storeItems) ? storeItems : [];
  const groupedAppointments = useMemo(
    () => groupAppointmentsByDate(safeAppointments),
    [safeAppointments]
  );

  const previewAppointments = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(groupedAppointments).map(([date, items]) => [
          date,
          {
            items: items.slice(0, MAX_VISIBLE_APPOINTMENTS),
            hiddenCount: Math.max(items.length - MAX_VISIBLE_APPOINTMENTS, 0),
          },
        ])
      ) as Record<
        string,
        { items: Appointment[]; hiddenCount: number }
      >,
    [groupedAppointments]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = formatDateString(new Date());

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const result: (number | null)[] = [];

    for (let index = 0; index < startDayOfWeek; index += 1) {
      result.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      result.push(day);
    }

    while (result.length % 7 !== 0) {
      result.push(null);
    }

    return result;
  }, [year, month]);

  const selectedAppointments = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const appts = groupedAppointments[selectedDate] ?? [];
    return [...appts].sort((a, b) => a.time.localeCompare(b.time));
  }, [groupedAppointments, selectedDate]);

  const selectedTimeSlots = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const appointmentByTime = new Map(
      selectedAppointments.map((appointment) => [appointment.time, appointment])
    );

    return TIME_SLOT_OPTIONS.map((time) => {
      const appointment = appointmentByTime.get(time) ?? null;

      return {
        time,
        appointment,
        passed: isAppointmentPassed(selectedDate, time),
      };
    });
  }, [selectedAppointments, selectedDate]);

  const availableSlotCount = useMemo(
    () => selectedTimeSlots.filter((slot) => !slot.appointment && !slot.passed).length,
    [selectedTimeSlots]
  );

  const bookedSlotCount = useMemo(
    () => selectedTimeSlots.filter((slot) => Boolean(slot.appointment)).length,
    [selectedTimeSlots]
  );

  const monthName = currentDate.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
  });

  const formatDate = (day: number) => {
    const monthPart = String(month + 1).padStart(2, '0');
    const dayPart = String(day).padStart(2, '0');
    return `${year}-${monthPart}-${dayPart}`;
  };

  useEffect(() => {
    if (!selectedDate || viewMode !== 'month') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      selectedDatePanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SCHEDULE_DENSITY_STORAGE_KEY, scheduleDensity);
  }, [scheduleDensity]);

  const handleSelectDate = (dateStr: string) => {
    if (selectedDate === dateStr) {
      selectedDatePanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }

    setSelectedDate(dateStr);
    onDateClick?.(dateStr);
  };

  return (
    <div className="flex h-full flex-col bg-[#FCFAF5] text-[#4A3B32]">
      <div className="shrink-0 border-b border-[#E8E3D8]">
        <div className="flex items-start justify-between gap-4 p-4 md:p-6">
          <div className="min-w-0 text-left">
            <div className="text-sm font-bold tracking-[0.32em] text-[#8C7A6B] md:text-base">
              預約日曆
            </div>
            <div className="mt-1 text-2xl font-black leading-none tracking-tight md:mt-2 md:text-5xl">
              {monthName}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 md:gap-3">
            <button
              type="button"
              onClick={() => {
                onCurrentDateChange?.(new Date(year, month - 1, 1));
                setSelectedDate(null);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E3D8] bg-white shadow-sm transition-colors hover:bg-[#F4F0EA] md:h-12 md:w-12"
              aria-label="上一個月份"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                onCurrentDateChange?.(new Date(year, month + 1, 1));
                setSelectedDate(null);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E3D8] bg-white shadow-sm transition-colors hover:bg-[#F4F0EA] md:h-12 md:w-12"
              aria-label="下一個月份"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEE6DA] px-4 py-3 md:px-6">
          <div className="inline-flex rounded-full border border-[#E2DCD0] bg-white p-1 shadow-sm">
            {(
              [
                { id: 'month', label: '月曆' },
                { id: 'schedule', label: '多日排程' },
              ] as const
            ).map((option) => {
              const isActive = viewMode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setViewMode(option.id)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors md:px-5 ${
                    isActive
                      ? 'bg-[#4A3B32] text-white'
                      : 'text-[#6F6257] hover:bg-[#F4F0EA]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {viewMode === 'schedule' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-[0.24em] text-[#8C7A6B]">
                密度
              </span>
              {(
                [
                  { id: 'compact', label: '緊湊' },
                  { id: 'normal', label: '正常' },
                  { id: 'focus', label: '放大' },
                ] as const
              ).map((option) => {
                const isActive = scheduleDensity === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setScheduleDensity(option.id)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors md:px-4 ${
                      isActive
                        ? 'border-[#4A3B32] bg-[#4A3B32] text-white'
                        : 'border-[#E2DCD0] bg-white text-[#6F6257] hover:bg-[#F4F0EA]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs font-semibold text-[#8C7A6B] md:text-sm">
              點日期可看當天詳細預約與空檔表
            </div>
          )}
        </div>
      </div>

      {viewMode === 'month' && (
      <div className="grid shrink-0 grid-cols-7 border-b border-[#E8E3D8] bg-[#F4F0EA]/60">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-bold tracking-widest text-[#7A6B5D] md:py-3 md:text-sm"
          >
            {day}
          </div>
        ))}
      </div>
      )}

      {isLoading && (
        <div className="shrink-0 border-b border-[#E8E3D8] bg-[#F8F2E8] px-4 py-2 text-xs font-bold text-[#7A6B5D] md:px-6 md:py-3 md:text-sm">
          正在同步本月預約資料...
        </div>
      )}

      {viewMode === 'schedule' && (
        <MultiDaySchedule
          currentDate={currentDate}
          appointments={safeAppointments}
          leaveSet={leaveSet}
          storeItems={safeStoreItems}
          density={scheduleDensity}
          onCurrentDateChange={onCurrentDateChange}
          onAddAppt={onAddAppt}
          onSelectAppt={onSelectAppt}
          onDateClick={onDateClick}
        />
      )}

      {viewMode === 'month' && (
      <>
      {/* ====== Mobile Grid: compact cells ====== */}
      <div className="grid shrink-0 grid-cols-7 auto-rows-[60px] md:hidden">
        {days.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="border-b border-r border-[#E8E3D8] bg-[#F8F5EF]"
              />
            );
          }

          const dateStr = formatDate(day);
          const dayAppointments = groupedAppointments[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isLeave = leaveSet.has(dateStr);
          const apptCount = dayAppointments.length;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleSelectDate(dateStr)}
              className={`relative flex flex-col items-center justify-center gap-1 border-b border-r border-[#E8E3D8] transition-colors ${
                isSelected
                  ? 'bg-[#F4F0EA] ring-2 ring-inset ring-[#4A3B32]/20'
                  : 'bg-[#FCFAF5] active:bg-[#F4F0EA]'
              }`}
            >
              {isLeave ? (
                <>
                  <span className="text-2xl font-black text-[#C75D4E]">休</span>
                  <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-[#8C7A6B]">{day}</span>
                </>
              ) : (
                <>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                      isToday
                        ? 'bg-[#C75D4E] text-white'
                        : isSelected
                          ? 'text-[#4A3B32]'
                          : 'text-[#4A3B32]/80'
                    }`}
                  >
                    {day}
                  </span>

              {!isLeave && apptCount > 0 ? (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(apptCount, 3) }, (_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[#C75D4E]"
                    />
                  ))}
                  {apptCount > 3 && (
                    <span className="ml-0.5 text-[11px] font-bold text-[#8C7A6B]">
                      +{apptCount - 3}
                    </span>
                  )}
                </div>
              ) : null}
              </>
              )}
            </button>
          );
        })}
      </div>
      </>
      )}

      {viewMode === 'month' && (
      <>
      {/* ====== Desktop Grid: rich cells (unchanged) ====== */}
      <div className="hidden md:grid md:grid-cols-7 md:auto-rows-[168px]">
        {days.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="border-b border-r border-[#E8E3D8] bg-[#F8F5EF]"
              />
            );
          }

          const dateStr = formatDate(day);
          const dayAppointments = groupedAppointments[dateStr] ?? [];
          const preview = previewAppointments[dateStr] ?? {
            items: [],
            hiddenCount: 0,
          };
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isLeave = leaveSet.has(dateStr);

          return (
            <div
              key={dateStr}
              className={`group relative border-b border-r border-[#E8E3D8] p-3 transition-colors ${
                isSelected ? 'bg-[#F4F0EA]' : 'bg-[#FCFAF5]'
              } ${isLeave ? 'opacity-75' : 'hover:bg-[#F9F6F0]'}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDate(dateStr)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-black ${
                    isToday
                      ? 'bg-[#C75D4E] text-white'
                      : 'bg-transparent text-[#4A3B32]'
                  }`}
                >
                  {day}
                </button>

                <div className="flex items-start gap-2">
                  {onToggleLeave && (
                    <button
                      type="button"
                      onClick={() => onToggleLeave(dateStr)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isLeave
                          ? 'border border-[#C75D4E] bg-[#FBE9E5] text-[#B24F41]'
                          : 'text-[#8C7A6B] hover:bg-[#F4F0EA]'
                      }`}
                      aria-label="切換休假"
                    >
                      <CalendarOff className="h-4 w-4" />
                    </button>
                  )}

                  {onAddAppt && !isLeave && (
                    <button
                      type="button"
                      onClick={() => onAddAppt(dateStr)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2DCD0] bg-white text-[#4A3B32] shadow-sm transition-colors hover:border-[#D6CABC] hover:bg-[#F4F0EA]"
                      aria-label="新增預約"
                    >
                      <Plus className="h-[18px] w-[18px]" />
                    </button>
                  )}
                </div>
              </div>

              {isLeave ? (
                <div className="mt-4 flex items-center justify-center">
                  <span className="rounded-full border border-[#C75D4E] px-3 py-1 text-xs font-bold tracking-widest text-[#C75D4E]">
                    休假
                  </span>
                </div>
              ) : (
                <div className="flex h-[100px] flex-wrap content-start gap-2 overflow-hidden">
                  {isLoading && dayAppointments.length === 0 && (
                    <>
                      <div className="h-11 w-11 animate-pulse rounded-full border border-[#E8E3D8] bg-white/70" />
                      <div className="h-11 w-11 animate-pulse rounded-full border border-[#E8E3D8] bg-white/60" />
                    </>
                  )}

                  {preview.items.map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      title={`${appt.time} ${appt.clientName}`}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        onSelectAppt?.(appt);
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DCCEBE] bg-white text-sm font-black text-[#4A3B32] shadow-sm transition hover:border-[#C75D4E] hover:text-[#C75D4E]"
                    >
                      {getClientBadge(appt.clientName)}
                    </button>
                  ))}

                  {preview.hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectDate(dateStr)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EADFD0] text-xs font-black text-[#6F6257]"
                    >
                      +{preview.hiddenCount}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* ====== Bottom Panel: selected date detail + actions ====== */}
      {viewMode === 'month' && selectedDate && (
        <div
          ref={selectedDatePanelRef}
          className="shrink-0 border-t border-[#E8E3D8] bg-white/80 backdrop-blur-sm"
        >
          <div className="p-4 md:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-[#7A6B5D] md:text-sm">已選日期</div>
                <div className="text-base font-bold md:text-lg">{selectedDate}</div>
              </div>

              <div className="flex items-center gap-2">
                {onToggleLeave && (
                  <button
                    type="button"
                    onClick={() => onToggleLeave(selectedDate)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold shadow-sm transition-colors md:px-4 md:py-2.5 md:text-sm ${
                      leaveSet.has(selectedDate)
                        ? 'border-[#C75D4E] bg-[#FBE9E5] text-[#B24F41]'
                        : 'border-[#E2DCD0] bg-white text-[#4A3B32] hover:bg-[#F4F0EA]'
                    }`}
                  >
                    <CalendarOff className="h-3.5 w-3.5" />
                    {leaveSet.has(selectedDate) ? '取消休假' : '設為休假'}
                  </button>
                )}

                {onAddAppt && !leaveSet.has(selectedDate) && (
                  <button
                    type="button"
                    onClick={() => onAddAppt(selectedDate)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#4A3B32] px-3 py-2 text-xs font-bold text-white shadow-sm md:px-4 md:py-2.5 md:text-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增預約
                  </button>
                )}
              </div>
            </div>

            {selectedAppointments.length === 0 ? (
              <p className="py-2 text-center text-sm text-[#7A6B5D]">
                {leaveSet.has(selectedDate)
                  ? '這一天已設為休假。'
                  : '這一天目前沒有預約。'}
              </p>
            ) : (
              <div className="max-h-[30vh] space-y-2 overflow-y-auto md:max-h-none">
                {selectedAppointments.map((appt) => {
                  const passed = isAppointmentPassed(selectedDate, appt.time);
                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onSelectAppt?.(appt)}
                      className={`w-full rounded-2xl border p-3 text-left transition-colors hover:shadow-sm ${
                        passed
                          ? 'border-[#E8E3D8] bg-[#F4F0EA] active:bg-[#EDE6DB]'
                          : 'border-[#E8E3D8] bg-[#FCFAF5] hover:bg-white active:bg-[#F4F0EA]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black ${
                            passed
                              ? 'border-[#D5C7B6] bg-[#EDE6DB] text-[#8C7A6B]'
                              : 'border-[#DCCEBE] bg-white text-[#4A3B32]'
                          }`}>
                            {getClientBadge(appt.clientName)}
                          </span>
                          <div>
                            <div className={`text-sm font-bold ${passed ? 'text-[#8C7A6B]' : 'text-[#4A3B32]'}`}>
                              {appt.clientName}
                            </div>
                            <div className="text-xs text-[#8C7A6B]">{appt.service}</div>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1.5 text-lg font-black ${
                          passed
                            ? 'bg-[#C75D4E] text-white'
                            : 'border border-[#E2DCD0] bg-white text-[#4A3B32]'
                        }`}>
                          {appt.time}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!leaveSet.has(selectedDate) && (
              <div className="mt-4 space-y-3">
                <div className="rounded-[28px] border border-[#E8E3D8] bg-[#FCFAF5] p-4 md:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold tracking-[0.28em] text-[#8C7A6B]">
                        當日時段表
                      </div>
                      <div className="mt-1 text-sm font-bold text-[#4A3B32] md:text-base">
                        可預約 {availableSlotCount} 格，已占用 {bookedSlotCount} 格
                      </div>
                    </div>
                    <div className="rounded-full border border-[#E2DCD0] bg-white px-3 py-1.5 text-xs font-bold text-[#7A6B5D]">
                      表內可直接新增或查看預約
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-[#E2DCD0] bg-white shadow-sm">
                    <div className="max-h-[42vh] overflow-auto">
                      <table className="w-full min-w-[640px] border-collapse text-left">
                        <thead className="sticky top-0 z-10 bg-[#F4F0EA]">
                          <tr className="text-xs font-bold tracking-[0.22em] text-[#7A6B5D]">
                            <th className="px-4 py-3">時段</th>
                            <th className="px-4 py-3">狀態</th>
                            <th className="px-4 py-3">預約內容</th>
                            <th className="px-4 py-3 text-right">動作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTimeSlots.map((slot) => {
                            const rowTone = slot.appointment
                              ? 'bg-white'
                              : slot.passed
                                ? 'bg-[#F4F0EA]/80'
                                : 'bg-[#FFFDFC]';

                            return (
                              <tr
                                key={slot.time}
                                className={`border-t border-[#EEE6DA] align-top ${rowTone}`}
                              >
                                <td className="px-4 py-3 text-sm font-black text-[#4A3B32]">
                                  {slot.time}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                      slot.appointment
                                        ? 'border border-[#DCCEBE] bg-[#FCFAF5] text-[#4A3B32]'
                                        : slot.passed
                                          ? 'bg-[#E7DED1] text-[#8C7A6B]'
                                          : 'border border-[#D9CCBC] bg-[#F9F4EC] text-[#4A3B32]'
                                    }`}
                                  >
                                    {slot.appointment ? '已預約' : slot.passed ? '已過' : '空檔'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {slot.appointment ? (
                                    <div>
                                      <div className="text-sm font-bold text-[#4A3B32]">
                                        {slot.appointment.clientName}
                                      </div>
                                      <div className="mt-1 text-xs text-[#8C7A6B]">
                                        {slot.appointment.service}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm font-semibold text-[#7A6B5D]">
                                      {slot.passed ? '此時段已過，無法安排新預約' : '目前可安排新預約'}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-end">
                                    {slot.appointment ? (
                                      <button
                                        type="button"
                                        onClick={() => onSelectAppt?.(slot.appointment)}
                                        className="rounded-full border border-[#DCCEBE] bg-white px-3 py-2 text-xs font-bold text-[#4A3B32] transition-colors hover:border-[#C75D4E] hover:text-[#C75D4E]"
                                      >
                                        查看預約
                                      </button>
                                    ) : !slot.passed ? (
                                      <button
                                        type="button"
                                        onClick={() => onAddAppt?.(selectedDate, slot.time)}
                                        className="rounded-full bg-[#4A3B32] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#3C2F28]"
                                      >
                                        新增預約
                                      </button>
                                    ) : (
                                      <span className="px-3 py-2 text-xs font-bold text-[#9A8B7E]">
                                        無
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
