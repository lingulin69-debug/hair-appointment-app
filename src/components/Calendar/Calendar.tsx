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

    return groupedAppointments[selectedDate] ?? [];
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FCFAF5] text-[#4A3B32]">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8E3D8] p-4 md:p-6">
        <div className="min-w-0 text-left">
          <div className="text-xs font-bold tracking-[0.32em] text-[#8C7A6B] md:text-sm">
            預約日曆
          </div>
          <div className="mt-2 text-4xl font-black leading-none tracking-tight md:text-5xl">
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
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E3D8] bg-white shadow-sm transition-colors hover:bg-[#F4F0EA] md:h-12 md:w-12"
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
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E3D8] bg-white shadow-sm transition-colors hover:bg-[#F4F0EA] md:h-12 md:w-12"
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
            className="py-3 text-center text-xs font-bold tracking-widest text-[#7A6B5D] md:text-sm"
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className={`shrink-0 border-b border-[#E8E3D8] bg-[#F8F2E8] px-4 py-3 text-sm font-bold text-[#7A6B5D] transition-[max-height,opacity,padding] duration-200 md:px-6 ${
          isLoading ? 'max-h-12 opacity-100' : 'max-h-0 overflow-hidden border-b-0 py-0 opacity-0'
        }`}
      >
        正在同步本月預約資料...
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
        {days.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[132px] border-b border-r border-[#E8E3D8] bg-[#F8F5EF] md:min-h-[168px]"
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
              className={`group relative min-h-[132px] border-b border-r border-[#E8E3D8] p-2 transition-colors md:min-h-[168px] md:p-3 ${
                isSelected ? 'bg-[#F4F0EA]' : 'bg-[#FCFAF5]'
              } ${isLeave ? 'opacity-75' : 'hover:bg-[#F9F6F0]'}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDate(dateStr)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black md:h-11 md:w-11 md:text-base ${
                    isToday
                      ? 'bg-[#C75D4E] text-white'
                      : 'bg-transparent text-[#4A3B32]'
                  }`}
                >
                  {day}
                </button>

                <div className="flex items-start gap-1.5 md:gap-2">
                  {onToggleLeave && (
                    <button
                      type="button"
                      onClick={() => onToggleLeave(dateStr)}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors md:h-9 md:w-9 ${
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
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E2DCD0] bg-white text-[#4A3B32] shadow-sm transition-colors hover:border-[#D6CABC] hover:bg-[#F4F0EA] md:h-9 md:w-9"
                      aria-label="新增預約"
                    >
                      <Plus className="h-4 w-4 md:h-[18px] md:w-[18px]" />
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
                <div className="flex h-[74px] flex-wrap content-start gap-2 overflow-hidden md:h-[100px]">
                  {isLoading && dayAppointments.length === 0 && (
                    <>
                      <div className="h-10 w-10 animate-pulse rounded-full border border-[#E8E3D8] bg-white/70" />
                      <div className="h-10 w-10 animate-pulse rounded-full border border-[#E8E3D8] bg-white/60" />
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
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DCCEBE] bg-white text-sm font-black text-[#4A3B32] shadow-sm transition hover:border-[#C75D4E] hover:text-[#C75D4E] md:h-11 md:w-11"
                    >
                      {getClientBadge(appt.clientName)}
                    </button>
                  ))}

                  {preview.hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EADFD0] text-xs font-black text-[#6F6257] md:h-11 md:w-11"
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

      <div
        className={`shrink-0 border-t border-[#E8E3D8] transition-[max-height,opacity,padding] duration-200 ${
          selectedDate ? 'max-h-[400px] p-4 opacity-100 md:p-6' : 'max-h-0 overflow-hidden p-0 opacity-0'
        }`}
      >
        {selectedDate && (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-[#7A6B5D]">已選日期</div>
                <div className="text-lg font-bold">{selectedDate}</div>
              </div>
              {onAddAppt && !leaveSet.has(selectedDate) && (
                <button
                  type="button"
                  onClick={() => onAddAppt(selectedDate)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4A3B32] px-4 py-2.5 text-sm font-bold text-white shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  新增預約
                </button>
              )}
            </div>

            {selectedAppointments.length === 0 ? (
              <p className="text-sm text-[#7A6B5D]">這一天目前沒有預約。</p>
            ) : (
              <div className="space-y-2">
                {selectedAppointments.map((appt) => (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => onSelectAppt?.(appt)}
                    className="w-full rounded-lg border border-[#E8E3D8] bg-white p-3 text-left hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{appt.time}</span>
                      <span className="text-sm text-[#7A6B5D]">{appt.service}</span>
                    </div>
                    <div className="mt-1 text-sm">{appt.clientName}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
