import React, { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  CalendarRange,
  Loader2,
  NotebookText,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import type { Appointment, Revenue, RevenueKind } from '../../types';
import {
  formatDateString,
  getDateRangeForTrailingDays,
  getDateRangeForTrailingMonths,
} from '../../utils/schedule';
import {
  buildDailyRevenueRows,
  buildMonthlyRevenueRows,
  buildMonthlySettlementRows,
  buildRevenueEvents,
  buildWeeklySettlementRows,
  summarizeRevenueEvents,
  type SettlementRangeRow,
} from '../../utils/revenue';

export type DashboardPeriod = '7d' | '30d' | '6m' | '1y';

type DashboardTab = 'overview' | 'income';
type SettlementTab = 'daily' | 'weekly' | 'monthly';
type RevenueFeedbackTone = 'success' | 'error' | 'info';

interface DashboardProps {
  appointments: Appointment[];
  revenues?: Revenue[] | null;
  isRevenueLoading?: boolean;
  onAddRevenue?: (entry: Omit<Revenue, 'id' | 'source'>) => Promise<string | null>;
  onDeleteRevenue?: (id: string) => Promise<boolean>;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

const PERIOD_OPTIONS: Array<{ id: DashboardPeriod; label: string }> = [
  { id: '7d', label: '近 7 天' },
  { id: '30d', label: '近 30 天' },
  { id: '6m', label: '近 6 個月' },
  { id: '1y', label: '近 1 年' },
];

const TAB_OPTIONS: Array<{ id: DashboardTab; label: string }> = [
  { id: 'overview', label: '概況' },
  { id: 'income', label: '收入' },
];

const SETTLEMENT_TAB_OPTIONS: Array<{ id: SettlementTab; label: string }> = [
  { id: 'daily', label: '日結餘' },
  { id: 'weekly', label: '週結算' },
  { id: 'monthly', label: '月結算' },
];

const REVENUE_FEEDBACK_TONE_CLASS: Record<RevenueFeedbackTone, string> = {
  success: 'border-[#CFE3D7] bg-[#F1F8F3] text-[#355F46]',
  error: 'border-[#E8C9C2] bg-[#FFF3EE] text-[#A34B3F]',
  info: 'border-[#E2DCD0] bg-[#FCFAF5] text-[#6F6257]',
};

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

function buildRecentDailyLabels(days: number): string[] {
  const safeDays = Math.max(1, days);
  const today = new Date();

  return Array.from({ length: safeDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (safeDays - 1 - index));
    return formatDateString(date);
  });
}

function buildDashboardPeriodRange(period: DashboardPeriod) {
  switch (period) {
    case '30d':
      return getDateRangeForTrailingDays(30, new Date());
    case '6m':
      return getDateRangeForTrailingMonths(6, new Date());
    case '1y':
      return getDateRangeForTrailingMonths(12, new Date());
    case '7d':
    default:
      return getDateRangeForTrailingDays(7, new Date());
  }
}

function isDateWithinRange(dateStr: string, startDate: string, endDate: string): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

function formatRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'numeric', day: 'numeric' };
  const startLabel = start.toLocaleDateString('zh-TW', formatOptions);
  const endLabel = end.toLocaleDateString('zh-TW', formatOptions);

  return startDate === endDate ? startLabel : `${startLabel} - ${endLabel}`;
}

function getSettlementTabDescription(tab: SettlementTab): string {
  switch (tab) {
    case 'weekly':
      return '本週累計從週一算到今天，並保留上週完整週結。';
    case 'monthly':
      return '本月累計從 1 號算到今天，並保留上月完整月結。';
    case 'daily':
    default:
      return '固定顯示最近 14 天的收入、支出與淨額。';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${year} / ${month}`;
}

export const Dashboard: React.FC<DashboardProps> = ({
  appointments,
  revenues = [],
  isRevenueLoading = false,
  onAddRevenue,
  onDeleteRevenue,
  period,
  onPeriodChange,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [settlementTab, setSettlementTab] = useState<SettlementTab>('daily');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(() => formatDateString(new Date()));
  const [entryKind, setEntryKind] = useState<RevenueKind>('income');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategory, setEntryCategory] = useState('其他收入');
  const [entryNote, setEntryNote] = useState('');
  const [isSavingRevenue, setIsSavingRevenue] = useState(false);
  const [revenueFeedback, setRevenueFeedback] = useState<{
    tone: RevenueFeedbackTone;
    message: string;
  } | null>(null);

  const safeAppointments = useMemo(
    () => (Array.isArray(appointments) ? appointments : []),
    [appointments]
  );
  const safeRevenues = useMemo(
    () => (Array.isArray(revenues) ? revenues : []),
    [revenues]
  );
  const activeAppointments = useMemo(
    () => safeAppointments.filter((appointment) => appointment.status !== 'cancelled'),
    [safeAppointments]
  );
  const periodRange = useMemo(() => buildDashboardPeriodRange(period), [period]);
  const periodAppointments = useMemo(
    () =>
      activeAppointments.filter((appointment) =>
        isDateWithinRange(
          appointment.dateStr,
          periodRange.startDateStr,
          periodRange.endDateStr
        )
      ),
    [activeAppointments, periodRange.endDateStr, periodRange.startDateStr]
  );
  const periodRevenues = useMemo(
    () =>
      safeRevenues.filter((entry) =>
        isDateWithinRange(entry.date, periodRange.startDateStr, periodRange.endDateStr)
      ),
    [periodRange.endDateStr, periodRange.startDateStr, safeRevenues]
  );

  const summary = useMemo(() => {
    const totalAppointments = periodAppointments.length;
    const uniqueCustomers = new Set(
      periodAppointments.map((appointment) => appointment.clientName.trim()).filter(Boolean)
    ).size;

    return {
      totalAppointments,
      uniqueCustomers,
    };
  }, [periodAppointments]);

  const chartData = useMemo(() => {
    const bucketLabels = buildBucketLabels(period);
    const counts = new Map<string, number>();

    for (const appointment of periodAppointments) {
      if (period === '6m' || period === '1y') {
        const monthKey = `${appointment.dateStr.slice(0, 7)}-01`;
        counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
      } else {
        counts.set(appointment.dateStr, (counts.get(appointment.dateStr) ?? 0) + 1);
      }
    }

    return bucketLabels.map((label) => ({
      label,
      count: counts.get(label) ?? 0,
      displayLabel: formatDateLabel(label, period),
    }));
  }, [period, periodAppointments]);

  const revenueEvents = useMemo(
    () => buildRevenueEvents(safeAppointments, safeRevenues),
    [safeAppointments, safeRevenues]
  );
  const periodRevenueEvents = useMemo(
    () => buildRevenueEvents(periodAppointments, periodRevenues),
    [periodAppointments, periodRevenues]
  );
  const revenueSummary = useMemo(
    () => summarizeRevenueEvents(periodRevenueEvents),
    [periodRevenueEvents]
  );
  const recentDailyRows = useMemo(
    () => buildDailyRevenueRows(revenueEvents, buildRecentDailyLabels(14)),
    [revenueEvents]
  );
  const weeklySettlementRows = useMemo(
    () => buildWeeklySettlementRows(revenueEvents),
    [revenueEvents]
  );
  const monthlySettlementRows = useMemo(
    () => buildMonthlySettlementRows(revenueEvents),
    [revenueEvents]
  );
  const monthOverviewRows = useMemo(
    () => buildMonthlyRevenueRows(revenueEvents),
    [revenueEvents]
  );
  const activeMonthKey =
    selectedMonthKey && monthOverviewRows.some((row) => row.monthKey === selectedMonthKey)
      ? selectedMonthKey
      : monthOverviewRows[0]?.monthKey ?? null;
  const activeMonthSummary = useMemo(
    () => monthOverviewRows.find((row) => row.monthKey === activeMonthKey) ?? null,
    [activeMonthKey, monthOverviewRows]
  );
  const activeMonthEvents = useMemo(() => {
    if (!activeMonthKey) {
      return [];
    }

    return revenueEvents
      .filter((event) => event.date.startsWith(activeMonthKey))
      .slice()
      .sort((left, right) =>
        `${right.date} ${right.source} ${right.id}`.localeCompare(
          `${left.date} ${left.source} ${left.id}`
        )
      );
  }, [activeMonthKey, revenueEvents]);
  const entryAmountNumber = Number(entryAmount);
  const isRevenueFormValid =
    Boolean(entryDate) && Number.isFinite(entryAmountNumber) && entryAmountNumber > 0;

  const resetRevenueForm = () => {
    setEntryAmount('');
    setEntryCategory(entryKind === 'income' ? '其他收入' : '其他支出');
    setEntryNote('');
    setRevenueFeedback(null);
  };

  const handleChangeEntryKind = (kind: RevenueKind) => {
    setRevenueFeedback(null);
    setEntryKind(kind);
    setEntryCategory((current) =>
      current === '其他收入' || current === '其他支出'
        ? kind === 'income'
          ? '其他收入'
          : '其他支出'
        : current
    );
  };

  const handleAddRevenue = async () => {
    const amount = entryAmountNumber;
    const trimmedCategory = entryCategory.trim();

    if (!onAddRevenue || isSavingRevenue) {
      return;
    }

    if (!isRevenueFormValid) {
      setRevenueFeedback({ tone: 'error', message: '請先填寫正確日期與金額。' });
      return;
    }

    setIsSavingRevenue(true);
    try {
      const savedId = await onAddRevenue({
        amount,
        date: entryDate,
        category:
          trimmedCategory || (entryKind === 'income' ? '其他收入' : '其他支出'),
        kind: entryKind,
        note: entryNote.trim(),
      });

      if (!savedId) {
        setRevenueFeedback({ tone: 'error', message: '收入記帳失敗，請稍後再試。' });
        return;
      }

      resetRevenueForm();
      setRevenueFeedback({
        tone: 'success',
        message: entryKind === 'income' ? '已新增加帳紀錄。' : '已新增扣帳紀錄。',
      });
    } finally {
      setIsSavingRevenue(false);
    }
  };

  const handleDeleteRevenue = async (entry: Revenue) => {
    if (!onDeleteRevenue) {
      return;
    }

    const shouldDelete = window.confirm(`確定要刪除 ${entry.date} 的這筆手動記帳嗎？`);
    if (!shouldDelete) {
      return;
    }

    const deleted = await onDeleteRevenue(entry.id);
    if (!deleted) {
      setRevenueFeedback({ tone: 'error', message: '刪除記帳失敗，請稍後再試。' });
      return;
    }

    setRevenueFeedback({ tone: 'success', message: '已刪除手動記帳。' });
  };

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
              {activeTab === 'overview' ? '預約與客流概況' : '收入與結算'}
            </h1>
            <p className="mt-2 text-sm text-[#7A6B5D]">
              {activeTab === 'overview'
                ? '依區間查看預約量、來客數與有效預約收入。'
                : '把非取消預約與手動加帳/扣帳一起結算，方便每天與每月對帳。'}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
              {TAB_OPTIONS.map((option) => {
                const isActive = option.id === activeTab;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setActiveTab(option.id)}
                    className={`shrink-0 rounded-full px-5 py-2.5 text-base font-bold transition ${
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

            <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
            {PERIOD_OPTIONS.map((option) => {
              const isActive = option.id === period;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onPeriodChange(option.id)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-base font-bold transition ${
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
        </div>

        {activeTab === 'overview' ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon={<CalendarRange className="h-6 w-6" />}
                title="預約總數"
                value={`${summary.totalAppointments}`}
              />
              <StatCard
                icon={<Users className="h-6 w-6" />}
                title="來客人數"
                value={`${summary.uniqueCustomers}`}
              />
              <StatCard
                icon={<BadgeDollarSign className="h-6 w-6" />}
                title="有效預約收入"
                value={formatCurrency(revenueSummary.appointmentIncome)}
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
                <EmptyState message="目前沒有可顯示的預約資料。" />
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
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="預約收入"
                value={formatCurrency(revenueSummary.appointmentIncome)}
              />
              <StatCard
                icon={<Wallet className="h-6 w-6" />}
                title="手動加帳"
                value={formatCurrency(revenueSummary.manualIncome)}
              />
              <StatCard
                icon={<TrendingDown className="h-6 w-6" />}
                title="手動扣帳"
                value={formatCurrency(revenueSummary.manualExpense)}
              />
              <StatCard
                icon={<ReceiptText className="h-6 w-6" />}
                title="目前結餘"
                value={formatCurrency(revenueSummary.balance)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <section className="rounded-[28px] border border-[#E3DACD] bg-white p-5 shadow-[0_16px_36px_rgba(74,59,50,0.05)] md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#4A3B32]">手動記帳</h2>
                    <p className="mt-1 text-sm text-[#7A6B5D]">
                      可補登產品銷售、材料成本、現金支出等，會一起併入結餘。
                    </p>
                  </div>
                  {(isRevenueLoading || isSavingRevenue) && (
                    <Loader2 className="h-5 w-5 animate-spin text-[#8C7A6B]" />
                  )}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-[#6F6257]">
                    日期
                    <input
                      id="revenue-entry-date"
                      name="revenueEntryDate"
                      type="date"
                      value={entryDate}
                      onChange={(event) => {
                        setEntryDate(event.target.value);
                        setRevenueFeedback(null);
                      }}
                      className="rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-4 py-3 outline-none focus:border-[#4A3B32]"
                    />
                  </label>

                  <div className="grid gap-2 text-sm font-semibold text-[#6F6257]">
                    類型
                    <div className="inline-flex rounded-full border border-[#E2DCD0] bg-[#FCFAF5] p-1">
                      {([
                        { id: 'income', label: '加帳' },
                        { id: 'expense', label: '扣帳' },
                      ] as const).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleChangeEntryKind(option.id)}
                          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                            entryKind === option.id
                              ? 'bg-[#4A3B32] text-white'
                              : 'text-[#6F6257] hover:bg-[#F4F0EA]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-[#6F6257]">
                    金額
                    <input
                      id="revenue-entry-amount"
                      name="revenueEntryAmount"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={entryAmount}
                      onChange={(event) => {
                        setEntryAmount(event.target.value);
                        setRevenueFeedback(null);
                      }}
                      placeholder="例如 1200"
                      className="rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-4 py-3 outline-none focus:border-[#4A3B32]"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-[#6F6257]">
                    分類
                    <input
                      id="revenue-entry-category"
                      name="revenueEntryCategory"
                      type="text"
                      value={entryCategory}
                      onChange={(event) => {
                        setEntryCategory(event.target.value);
                        setRevenueFeedback(null);
                      }}
                      placeholder={entryKind === 'income' ? '例如 產品銷售' : '例如 材料成本'}
                      className="rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-4 py-3 outline-none focus:border-[#4A3B32]"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-[#6F6257] md:col-span-2">
                    備註
                    <textarea
                      id="revenue-entry-note"
                      name="revenueEntryNote"
                      value={entryNote}
                      onChange={(event) => {
                        setEntryNote(event.target.value);
                        setRevenueFeedback(null);
                      }}
                      placeholder="例如 染膏補貨、產品現金販售"
                      rows={3}
                      className="rounded-2xl border border-[#E2DCD0] bg-[#FCFAF5] px-4 py-3 outline-none focus:border-[#4A3B32]"
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div
                    aria-live="polite"
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                      revenueFeedback
                        ? REVENUE_FEEDBACK_TONE_CLASS[revenueFeedback.tone]
                        : REVENUE_FEEDBACK_TONE_CLASS.info
                    }`}
                  >
                    {revenueFeedback?.message ?? '請先填日期與金額；送出後會直接更新下方結餘。'}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetRevenueForm}
                      disabled={isSavingRevenue}
                      className="rounded-full border border-[#E2DCD0] bg-white px-5 py-3 text-sm font-bold text-[#4A3B32] transition hover:bg-[#F4F0EA] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRevenue}
                      disabled={!onAddRevenue || isSavingRevenue || !isRevenueFormValid}
                      className="rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingRevenue ? '儲存中...' : '新增記帳'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-[#E3DACD] bg-white p-5 shadow-[0_16px_36px_rgba(74,59,50,0.05)] md:p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#4A3B32]">區間結算</h2>
                    <p className="mt-1 text-sm text-[#7A6B5D]">
                      {getSettlementTabDescription(settlementTab)}
                    </p>
                  </div>
                  <NotebookText className="h-5 w-5 text-[#8C7A6B]" />
                </div>

                <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {SETTLEMENT_TAB_OPTIONS.map((option) => {
                    const isActive = option.id === settlementTab;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSettlementTab(option.id)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                          isActive
                            ? 'bg-[#4A3B32] text-white shadow-sm'
                            : 'border border-[#E2DCD0] bg-white text-[#4A3B32] hover:bg-[#F3ECE2]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4">
                  {settlementTab === 'daily' ? (
                    <div className="space-y-3">
                      {recentDailyRows.map((row) => (
                        <div
                          key={row.date}
                          className="rounded-2xl border border-[#EAE1D4] bg-[#FCFAF5] px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-bold text-[#4A3B32]">
                                {formatDateLabel(row.date, '30d')}
                              </div>
                              <div className="mt-1 text-xs text-[#8C7A6B]">
                                {row.events.length > 0
                                  ? row.events.map((event) => event.category).join(' / ')
                                  : '當日沒有收入或支出記錄'}
                              </div>
                            </div>
                            <div className="text-right text-sm font-semibold text-[#6F6257]">
                              <div>收入 {formatCurrency(row.income)}</div>
                              <div>支出 {formatCurrency(row.expense)}</div>
                              <div className="mt-1 text-base font-black text-[#4A3B32]">
                                結餘 {formatCurrency(row.balance)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {(settlementTab === 'weekly'
                        ? weeklySettlementRows.map((row, index) => ({
                            row,
                            title: index === 0 ? '本週累計' : '上週結算',
                            subtitle: `${formatRangeLabel(row.startDate, row.endDate)} · ${
                              index === 0 ? '週一到今天' : '上週一到上週日'
                            }`,
                          }))
                        : monthlySettlementRows.map((row, index) => ({
                            row,
                            title: index === 0 ? '本月累計' : '上月結算',
                            subtitle: `${formatRangeLabel(row.startDate, row.endDate)} · ${
                              index === 0 ? '1 號到今天' : '完整月份'
                            }`,
                          }))
                      ).map((item) => (
                        <SettlementSummaryCard
                          key={item.row.key}
                          row={item.row}
                          title={item.title}
                          subtitle={item.subtitle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <section className="rounded-[28px] border border-[#E3DACD] bg-white p-5 shadow-[0_16px_36px_rgba(74,59,50,0.05)] md:p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#4A3B32]">月份總覽</h2>
                    <p className="mt-1 text-sm text-[#7A6B5D]">
                      依最近 1 年資料回看各月份收入、支出與淨額；點月份可直接查看當月紀錄。
                    </p>
                  </div>
                  <CalendarRange className="h-5 w-5 text-[#8C7A6B]" />
                </div>

                {monthOverviewRows.length === 0 ? (
                  <EmptyState message="目前還沒有足夠的收入資料可查看月份總覽。" />
                ) : (
                  <div className="space-y-3">
                    {monthOverviewRows.map((row) => (
                      <button
                        key={row.monthKey}
                        type="button"
                        onClick={() => setSelectedMonthKey(row.monthKey)}
                        className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                          activeMonthKey === row.monthKey
                            ? 'border-[#4A3B32] bg-[#F7F1E7] shadow-sm'
                            : 'border-[#EAE1D4] bg-[#FCFAF5] hover:border-[#D6CABB] hover:bg-[#FFFDF8]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-base font-bold text-[#4A3B32]">
                              {formatMonthLabel(row.monthKey)}
                            </div>
                            <div className="mt-1 text-xs text-[#8C7A6B]">
                              共 {row.eventCount} 筆收入事件
                            </div>
                          </div>
                          <div className="text-right text-sm font-semibold text-[#6F6257]">
                            <div>收入 {formatCurrency(row.income)}</div>
                            <div>支出 {formatCurrency(row.expense)}</div>
                            <div className="mt-1 text-base font-black text-[#4A3B32]">
                              淨額 {formatCurrency(row.balance)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}

                    {activeMonthSummary && (
                      <div className="rounded-[24px] border border-[#E6DED2] bg-[#FFFCF7] p-4 md:p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-lg font-black text-[#4A3B32]">
                              {formatMonthLabel(activeMonthSummary.monthKey)} 紀錄
                            </h3>
                            <p className="mt-1 text-sm text-[#7A6B5D]">
                              預約收入與手動加帳/扣帳都會列在這裡，方便月底逐筆回查。
                            </p>
                          </div>
                          <div className="rounded-full bg-[#F1E9DD] px-4 py-2 text-sm font-black text-[#6F6257]">
                            共 {activeMonthSummary.eventCount} 筆
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="rounded-2xl bg-[#FCFAF5] px-4 py-3 text-sm font-bold text-[#6F6257]">
                            <div className="text-xs tracking-[0.2em] text-[#8C7A6B]">收入</div>
                            <div className="mt-2 text-lg font-black text-[#355F46]">
                              {formatCurrency(activeMonthSummary.income)}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-[#FCFAF5] px-4 py-3 text-sm font-bold text-[#6F6257]">
                            <div className="text-xs tracking-[0.2em] text-[#8C7A6B]">支出</div>
                            <div className="mt-2 text-lg font-black text-[#A85145]">
                              {formatCurrency(activeMonthSummary.expense)}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-[#FCFAF5] px-4 py-3 text-sm font-bold text-[#6F6257]">
                            <div className="text-xs tracking-[0.2em] text-[#8C7A6B]">淨額</div>
                            <div className="mt-2 text-lg font-black text-[#4A3B32]">
                              {formatCurrency(activeMonthSummary.balance)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                          {activeMonthEvents.map((event) => {
                            const isExpense = event.expense > 0;
                            const amount = isExpense ? event.expense : event.income;

                            return (
                              <div
                                key={event.id}
                                className="rounded-2xl border border-[#EAE1D4] bg-[#FCFAF5] px-4 py-3"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-black text-[#4A3B32]">
                                      {event.date} · {event.category}
                                    </div>
                                    <div className="mt-1 text-sm text-[#7A6B5D]">
                                      {event.label}
                                      {event.note ? ` · ${event.note}` : ''}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <div
                                      className={`text-base font-black ${
                                        isExpense ? 'text-[#A85145]' : 'text-[#355F46]'
                                      }`}
                                    >
                                      {isExpense ? '- ' : '+ '}
                                      {formatCurrency(amount)}
                                    </div>
                                    <div className="mt-1 text-xs font-bold text-[#8C7A6B]">
                                      {event.source === 'appointment' ? '預約收入' : '手動記帳'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-[28px] border border-[#E3DACD] bg-white p-5 shadow-[0_16px_36px_rgba(74,59,50,0.05)] md:p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#4A3B32]">手動記帳紀錄</h2>
                    <p className="mt-1 text-sm text-[#7A6B5D]">
                      這裡只列你手動補登的收支，預約收入會自動從日曆帶入。
                    </p>
                  </div>
                  <ReceiptText className="h-5 w-5 text-[#8C7A6B]" />
                </div>

                {safeRevenues.length === 0 ? (
                  <EmptyState message="目前還沒有手動記帳紀錄。" />
                ) : (
                  <div className="space-y-3">
                    {safeRevenues.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-[#EAE1D4] bg-[#FCFAF5] px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-bold text-[#4A3B32]">
                              {entry.date} · {entry.category}
                            </div>
                            <div className="mt-1 text-sm text-[#7A6B5D]">
                              {entry.note?.trim() || '沒有備註'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className={`text-right text-base font-black ${
                                entry.kind === 'expense' ? 'text-[#A85145]' : 'text-[#355F46]'
                              }`}
                            >
                              {entry.kind === 'expense' ? '- ' : '+ '}
                              {formatCurrency(entry.amount)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteRevenue(entry)}
                              disabled={!onDeleteRevenue}
                              className="rounded-full border border-[#E2DCD0] p-2 text-[#A85145] transition hover:bg-[#F7ECE7] disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`刪除 ${entry.date} 的手動記帳`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface EmptyStateProps {
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
  return (
    <div className="rounded-2xl border border-dashed border-[#D5C7B6] bg-[#F8F2E8] px-6 py-12 text-center text-[#7A6B5D]">
      {message}
    </div>
  );
};

interface SettlementSummaryCardProps {
  row: SettlementRangeRow;
  title: string;
  subtitle: string;
}

const SettlementSummaryCard: React.FC<SettlementSummaryCardProps> = ({
  row,
  title,
  subtitle,
}) => {
  return (
    <div className="rounded-2xl border border-[#EAE1D4] bg-[#FCFAF5] px-4 py-4">
      <div className="text-base font-bold text-[#4A3B32]">{title}</div>
      <div className="mt-1 text-xs text-[#8C7A6B]">{subtitle}</div>

      <div className="mt-4 space-y-2 text-sm font-semibold text-[#6F6257]">
        <div className="flex items-center justify-between gap-3">
          <span>收入</span>
          <span>{formatCurrency(row.income)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>支出</span>
          <span>{formatCurrency(row.expense)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#E4D9CB] pt-2 text-base font-black text-[#4A3B32]">
          <span>結餘</span>
          <span>{formatCurrency(row.balance)}</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-[#8C7A6B]">
        {row.eventCount > 0 ? `共 ${row.eventCount} 筆收入事件` : '目前沒有收入或支出記錄'}
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
        <span className="text-base font-semibold">{title}</span>
      </div>
      <div className="text-4xl font-black tabular-nums text-[#4A3B32] md:text-5xl">{value}</div>
    </div>
  );
};
