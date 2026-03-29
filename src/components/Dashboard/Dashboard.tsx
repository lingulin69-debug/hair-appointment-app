import React, { useMemo, useRef, useState } from 'react';
import { CalendarRange, TrendingUp, Users } from 'lucide-react';
import { formatDateString } from '../../utils/schedule';

export type DashboardPeriod = '7d' | '30d' | '6m' | '1y';

type ChartMode = 'date' | 'month' | 'year';

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

const CHART_MODE_OPTIONS: Array<{ id: ChartMode; label: string }> = [
  { id: 'date', label: '日期' },
  { id: 'month', label: '月份' },
  { id: 'year', label: '年' },
];

function formatDateLabel(dateStr: string, period: DashboardPeriod) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (period === '6m' || period === '1y') {
    return date.toLocaleDateString('zh-TW', {
      month: 'numeric',
      year: period === '1y' ? '2-digit' : undefined,
    });
  }
  return date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

function buildBucketLabels(period: DashboardPeriod): string[] {
  const today = new Date();
  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      return formatDateString(d);
    });
  }
  const months = period === '6m' ? 6 : 12;
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    return formatDateString(d);
  });
}

function buildChartModeData(appointments: Appointment[], mode: ChartMode) {
  if (mode === 'date') {
    const counts = new Map<string, number>();
    const sorted = [...appointments].sort((a, b) => a.date.localeCompare(b.date));
    for (const appt of sorted) {
      counts.set(appt.date, (counts.get(appt.date) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries());
    return entries.map(([key, count]) => ({
      label: key,
      displayLabel: new Date(`${key}T00:00:00`).toLocaleDateString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
      }),
      count,
    }));
  }
  if (mode === 'month') {
    const counts = new Map<string, number>();
    for (const appt of appointments) {
      const key = appt.date.slice(0, 7);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([key, count]) => {
      const [y, m] = key.split('-');
      return { label: key, displayLabel: `${Number(m)}月`, count };
    });
  }
  // year
  const counts = new Map<string, number>();
  for (const appt of appointments) {
    const key = appt.date.slice(0, 4);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const entries = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([key, count]) => ({
    label: key,
    displayLabel: `${key}年`,
    count,
  }));
}

// ── SVG Sparkline Curve Chart ─────────────────────────────────────────────────
interface SparklineProps {
  data: { label: string; displayLabel: string; count: number }[];
}

function SparklineChart({ data }: SparklineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 800;
  const H = 220;
  const PAD_X = 40;
  const PAD_TOP = 28;
  const PAD_BOTTOM = 48;

  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: data.length === 1 ? PAD_X + chartW / 2 : PAD_X + (i / (data.length - 1)) * chartW,
    y: PAD_TOP + chartH - ((d.count - minVal) / range) * chartH,
    ...d,
  }));

  // Smooth bezier path
  function buildPath(pts: { x: number; y: number }[]) {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
      const cp1y = pts[i].y;
      const cp2x = pts[i].x + (2 * (pts[i + 1].x - pts[i].x)) / 3;
      const cp2y = pts[i + 1].y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return d;
  }

  function buildAreaPath(pts: { x: number; y: number }[]) {
    if (pts.length === 0) return '';
    const baseline = PAD_TOP + chartH;
    const linePath = buildPath(pts);
    return (
      linePath +
      ` L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`
    );
  }

  const linePath = buildPath(points);
  const areaPath = buildAreaPath(points);

  // Y-axis grid labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: Math.round(minVal + t * range),
    y: PAD_TOP + chartH - t * chartH,
  }));

  // X-axis labels: show max 8 labels
  const labelStep = Math.ceil(data.length / 8);
  const xLabels = points.filter((_, i) => i % labelStep === 0 || i === data.length - 1);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-6 py-12 text-center text-sm text-[#7A6B5D]">
        目前沒有可顯示的預約資料。
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 'auto', minHeight: 160 }}
        role="img"
        aria-label="客流量曲線圖"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C75D4E" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#C75D4E" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B7355" />
            <stop offset="100%" stopColor="#C75D4E" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD_X}
              y1={tick.y}
              x2={W - PAD_X}
              y2={tick.y}
              stroke="#E8E0D4"
              strokeWidth="1"
              strokeDasharray={tick.value === 0 ? undefined : '4 4'}
            />
            <text
              x={PAD_X - 8}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#B09A88"
              fontFamily="sans-serif"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((pt, i) => (
          <g
            key={pt.label}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 6 : 4}
              fill={hoveredIndex === i ? '#C75D4E' : '#fff'}
              stroke={hoveredIndex === i ? '#C75D4E' : '#8B7355'}
              strokeWidth="2"
              style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
            />
            {/* Hover tooltip */}
            {hoveredIndex === i && (
              <g>
                <rect
                  x={Math.min(Math.max(pt.x - 32, PAD_X), W - PAD_X - 64)}
                  y={pt.y - 38}
                  width="64"
                  height="26"
                  rx="8"
                  fill="#4A3B32"
                />
                <text
                  x={Math.min(Math.max(pt.x, PAD_X + 32), W - PAD_X - 32)}
                  y={pt.y - 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#FCFAF5"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {pt.count} 筆
                </text>
              </g>
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((pt) => (
          <text
            key={`xl-${pt.label}`}
            x={pt.x}
            y={H - 10}
            textAnchor="middle"
            fontSize="11"
            fill="#B09A88"
            fontFamily="sans-serif"
          >
            {pt.displayLabel}
          </text>
        ))}
      </svg>
    </div>
  );
}

export const Dashboard: React.FC<DashboardProps> = ({
  appointments,
  period,
  onPeriodChange,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('date');

  const summary = useMemo(() => {
    const totalAppointments = appointments.length;
    const totalRevenue = appointments.reduce(
      (sum, appt) => sum + (appt.amount || 0),
      0
    );
    const uniqueCustomers = new Set(
      appointments.map((appt) => appt.customerName.trim()).filter(Boolean)
    ).size;
    const averageTicket =
      totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0;
    return { totalAppointments, uniqueCustomers, averageTicket };
  }, [appointments]);

  const chartData = useMemo(() => {
    // When chart mode is set, use all-appointments bucketing per mode
    return buildChartModeData(appointments, chartMode);
  }, [appointments, chartMode]);

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
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-150 ${
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

        {/* Line Chart Card */}
        <div className="rounded-[28px] border border-[#E3DACD] bg-white p-5 shadow-[0_16px_36px_rgba(74,59,50,0.05)] md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#4A3B32]">客流量</h2>
              <p className="mt-0.5 text-sm text-[#7A6B5D]">
                各時間段的預約數量趨勢。
              </p>
            </div>
            {/* Chart mode tabs */}
            <div className="flex gap-1.5 rounded-2xl border border-[#E8E0D4] bg-[#F8F3ED] p-1">
              {CHART_MODE_OPTIONS.map((opt) => {
                const isActive = opt.id === chartMode;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setChartMode(opt.id)}
                    className={`rounded-xl px-4 py-1.5 text-sm font-bold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#4A3B32] text-white shadow-sm'
                        : 'text-[#7A6B5D] hover:text-[#4A3B32]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <SparklineChart data={chartData} />
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
