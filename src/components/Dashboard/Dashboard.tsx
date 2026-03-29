import React, { useMemo } from 'react';
import { CalendarRange, TrendingUp, Users } from 'lucide-react';
import { formatDateString } from '../../utils/schedule';

export type DashboardPeriod = '7d' | '30d' | '6m' | '1y';

interface Appointment {
  id: string;
  date: string;
  time: string;
  customerName: string;
  service: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
}

interface DashboardProps {
  appointments: Appointment[];
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

const PERIOD_OPTIONS: Array<{ id: DashboardPeriod; label: string }> = [
  { id: '7d', label: '近 7 天' },
  { id: '30d', label: '近 30 天' },
  { id: '6m', label: '近 6 個月' },
  { id: '1y', label: '近 1 年' },
];

function formatDateLabel(dateStr: string, period: DashboardPeriod) {
  const date = new Date(`${dateStr}T00:00:00`);

  if (period === '6m' || period === '1y') {
    return date.toLocaleDateString('zh-TW', {
      month: 'numeric',
      year: period === '1y' ? '2-digit' : undefined,
    });
  }

  return date.toLocaleDateString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
  });
}

function buildBucketLabels(period: DashboardPeriod): string[] {
  const today = new Date();

  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      return formatDateString(date);
    });
  }

  const months = period === '6m' ? 6 : 12;
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - (months - 1 - index),
      1
    );
    return formatDateString(date);
  });
}

export const Dashboard: React.FC<DashboardProps> = ({
  appointments,
  period,
  onPeriodChange,
}) => {
  const summary = useMemo(() => {
    const totalAppointments = appointments.length;
    const totalRevenue = appointments.reduce(
      (sum, appointment) => sum + (appointment.amount || 0),
      0
    );
    const uniqueCustomers = new Set(
      appointments.map((appointment) => appointment.customerName.trim()).filter(Boolean)
    ).size;
    const averageTicket =
      totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0;

    return {
      totalAppointments,
      uniqueCustomers,
      averageTicket,
    };
  }, [appointments]);

  const chartData = useMemo(() => {
    const bucketLabels = buildBucketLabels(period);
    const counts = new Map<string, number>();

    for (const appointment of appointments) {
      if (period === '6m' || period === '1y') {
        const monthKey = `${appointment.date.slice(0, 7)}-01`;
        counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
      } else {
        counts.set(appointment.date, (counts.get(appointment.date) ?? 0) + 1);
      }
    }

    return bucketLabels.map((label) => ({
      label,
      count: counts.get(label) ?? 0,
      displayLabel: formatDateLabel(label, period),
    }));
  }, [appointments, period]);

  const maxCount = Math.max(...chartData.map((item) => item.count), 1);

  return (
    <div className="min-h-full bg-[#FCFAF5] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.32em] text-[#8C7A6B]">
              預約統計
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#4A3B32] md:text-4xl">
              預約與客流概況
            </h1>
            <p className="mt-2 text-sm text-[#7A6B5D]">
              依區間查看預約量、來客人數與平均客單。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => {
              const isActive = option.id === period;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onPeriodChange(option.id)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    isActive
                      ? 'bg-[#4A3B32] text-white shadow-md'
                      : 'border border-[#E2DCD0] bg-white text-[#4A3B32] hover:bg-[#F3ECE2]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={<CalendarRange className="h-5 w-5" />}
            title="預約總數"
            value={`${summary.totalAppointments}`}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            title="來客人數"
            value={`${summary.uniqueCustomers}`}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="平均客單"
            value={`NT$ ${summary.averageTicket.toLocaleString()}`}
          />
        </div>

        <div className="rounded-[28px] border border-[#E3DACD] bg-white p-5 shadow-[0_16px_36px_rgba(74,59,50,0.05)] md:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#4A3B32]">客流量</h2>
            <p className="mt-1 text-sm text-[#7A6B5D]">
              顯示所選區間內各時間桶的預約數。
            </p>
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-6 py-12 text-center text-[#7A6B5D]">
              目前沒有可顯示的預約資料。
            </div>
          ) : (
            <div className="space-y-3">
              {chartData.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-16 shrink-0 text-right text-xs text-[#7A6B5D] md:w-20">
                    {item.displayLabel}
                  </div>
                  <div className="h-9 flex-1 overflow-hidden rounded-full bg-[#F4F0EA]">
                    <div
                      className="flex h-full items-center justify-end rounded-full bg-[linear-gradient(90deg,#8B7355_0%,#C75D4E_100%)] pr-3 text-sm font-bold text-white transition-all"
                      style={{
                        width: `${Math.max(
                          (item.count / maxCount) * 100,
                          item.count > 0 ? 12 : 0
                        )}%`,
                      }}
                    >
                      {item.count > 0 ? item.count : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value }) => {
  return (
    <div className="rounded-[24px] border border-[#E3DACD] bg-white p-5 shadow-[0_12px_30px_rgba(74,59,50,0.05)]">
      <div className="mb-3 flex items-center gap-2 text-[#7A6B5D]">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-2xl font-black text-[#4A3B32] md:text-3xl">{value}</div>
    </div>
  );
};
