import React, { useMemo } from 'react';
import { CalendarRange, Users } from 'lucide-react';
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
    const uniqueCustomers = new Set(
      appointments.map((appointment) => appointment.customerName.trim()).filter(Boolean)
    ).size;
    return {
      totalAppointments,
      uniqueCustomers,
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
              依區間查看預約量與來客人數。
            </p>
          </div>

          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
            {PERIOD_OPTIONS.map((option) => {
              const isActive = option.id === period;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onPeriodChange(option.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        </div>

        <div className="rounded-[28px] border border-[#E3DACD] bg-white p-5 shadow-[0_16px_36px_rgba(74,59,50,0.05)] md:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#4A3B32]">客流量</h2>
            <p className="mt-1 text-sm text-[#7A6B5D]">
              顯示所選區間內各時間的預約數。
            </p>
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-6 py-12 text-center text-[#7A6B5D]">
              目前沒有可顯示的預約資料。
            </div>
          ) : period === '7d' ? (
            <div className="space-y-3">
              {chartData.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-16 shrink-0 text-right text-xs text-[#7A6B5D] md:w-20">
                    {item.displayLabel}
                  </div>
                  <div className="h-9 flex-1 overflow-hidden rounded-full bg-[#F4F0EA]">
                    <div
                      className="flex h-full items-center justify-end rounded-full bg-[#C75D4E] pr-3 text-sm font-bold text-white transition-all"
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
          ) : (
            <CurveChart data={chartData} />
          )}
        </div>
      </div>
    </div>
  );
};

interface CurveChartProps {
  data: Array<{ label: string; count: number; displayLabel: string }>;
}

const CurveChart: React.FC<CurveChartProps> = ({ data }) => {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const pad = { top: 28, right: 16, bottom: 36, left: 16 };
  const w = 600;
  const h = 220;
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const pts = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * cw,
    y: pad.top + ch - (d.count / maxVal) * ch,
  }));

  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${pad.top + ch} L ${pts[0].x} ${pad.top + ch} Z`;

  const maxLabels = 8;
  const labelInterval = Math.max(1, Math.ceil(data.length / maxLabels));

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="curveAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C75D4E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#C75D4E" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = pad.top + ch * (1 - ratio);
        return (
          <line
            key={ratio}
            x1={pad.left}
            y1={y}
            x2={pad.left + cw}
            y2={y}
            stroke="#E8E3D8"
            strokeWidth="1"
          />
        );
      })}

      <path d={areaPath} fill="url(#curveAreaFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#C75D4E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {pts.map((pt, i) => (
        <g key={data[i].label}>
          <circle
            cx={pt.x}
            cy={pt.y}
            r={data[i].count > 0 ? 4 : 2.5}
            fill={data[i].count > 0 ? '#C75D4E' : '#D5C7B6'}
          />
          {data[i].count > 0 && (
            <text
              x={pt.x}
              y={pt.y - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#4A3B32"
            >
              {data[i].count}
            </text>
          )}
        </g>
      ))}

      {data.map((d, i) => {
        if (i % labelInterval !== 0 && i !== data.length - 1) return null;
        const x = pad.left + (i / (data.length - 1)) * cw;
        return (
          <text
            key={`lbl-${d.label}`}
            x={x}
            y={h - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#7A6B5D"
          >
            {d.displayLabel}
          </text>
        );
      })}
    </svg>
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
