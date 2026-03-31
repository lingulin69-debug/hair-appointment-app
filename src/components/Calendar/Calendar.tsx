import React, { useMemo, useState } from 'react';
import { CalendarOff, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Appointment } from '../../types';
import { formatDateString, groupAppointmentsByDate } from '../../utils/schedule';

interface CalendarProps {
  currentDate: Date;
  appointments?: Appointment[] | null;
  isLoading?: boolean;
  leaveSet: Set<string>;
  onCurrentDateChange?: (date: Date) => void;
  onDateClick?: (date: string) => void;
  onAddAppt?: (date: string) => void;
  onSelectAppt?: (appt: Appointment) => void;
  onToggleLeave?: (dateStr: string) => void;
}

const DAYS_OF_WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const MAX_VISIBLE_APPOINTMENTS = 6;

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
  isLoading = false,
  leaveSet,
  onCurrentDateChange,
  onDateClick,
  onAddAppt,
  onSelectAppt,
  onToggleLeave,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const safeAppointments = Array.isArray(appointments) ? appointments : [];
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

  const monthName = currentDate.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
  });

  const formatDate = (day: number) => {
    const monthPart = String(month + 1).padStart(2, '0');
    const dayPart = String(day).padStart(2, '0');
    return `${year}-${monthPart}-${dayPart}`;
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    onDateClick?.(dateStr);
  };

  return (
    <div className="flex h-full flex-col bg-[#FCFAF5] text-[#4A3B32]">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8E3D8] p-4 md:p-6">
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

      {isLoading && (
        <div className="shrink-0 border-b border-[#E8E3D8] bg-[#F8F2E8] px-4 py-2 text-xs font-bold text-[#7A6B5D] md:px-6 md:py-3 md:text-sm">
          正在同步本月預約資料...
        </div>
      )}

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
                      onClick={() => setSelectedDate(dateStr)}
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

      {/* ====== Bottom Panel: selected date detail + actions ====== */}
      {selectedDate && (
        <div className="shrink-0 border-t border-[#E8E3D8] bg-white/80 backdrop-blur-sm">
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
          </div>
        </div>
      )}
    </div>
  );
};
