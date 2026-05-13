import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calculator, ChevronLeft, ChevronRight, CloudOff, Loader2, CheckCircle2, LogOut, Upload } from 'lucide-react';
import { interactionMotion } from '../../styles/interactionMotion';

type SyncStatus = 'online' | 'syncing' | 'synced' | 'offline';
type WorkspaceMode = 'frontdesk' | 'backoffice';
type UserAccessRole = 'admin' | 'owner' | 'staff';

interface NavbarProps {
  currentMode: WorkspaceMode;
  currentView: string;
  onModeChange: (mode: WorkspaceMode) => void;
  onViewChange: (view: string) => void;
  onCalcOpen: () => void;
  syncStatus?: SyncStatus;
  onSyncNow?: () => void;
  userEmail?: string | null;
  userRole?: UserAccessRole | null;
  onSignOut?: () => void | Promise<void>;
}

const modeOptions: Array<{
  id: WorkspaceMode;
  label: string;
  description: string;
}> = [
  { id: 'frontdesk', label: '前台營運', description: '預約與結帳' },
  { id: 'backoffice', label: '後台管理', description: '顧客、商品與報表' },
];

const tabsByMode: Record<WorkspaceMode, Array<{ id: string; label: string }>> = {
  frontdesk: [{ id: 'calendar', label: '日曆排程' }],
  backoffice: [
    { id: 'clients', label: '顧客目錄' },
    { id: 'services', label: '服務與商品' },
    { id: 'dashboard', label: '預約統計' },
  ],
};

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  currentView,
  onModeChange,
  onViewChange,
  onCalcOpen,
  syncStatus = 'online',
  onSyncNow,
  userEmail,
  userRole,
  onSignOut,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const visibleTabs = tabsByMode[currentMode];
  const visibleModeOptions = userRole === 'staff'
    ? modeOptions.filter((mode) => mode.id === 'frontdesk')
    : modeOptions;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, currentMode]);

  return (
    <div className="z-10 flex shrink-0 flex-col justify-between gap-4 border-b border-[#E2DCD0] bg-white/50 px-4 py-4 backdrop-blur-md md:flex-row md:items-center md:px-10 md:py-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center text-3xl font-black tracking-widest text-[#4A3B32]">
            <span className="ml-1 text-2xl font-mono tracking-wider text-[#8C7A6B]">
              Amy.SALON
            </span>
          </div>
          <div className="mt-1 text-xs font-bold tracking-[0.24em] text-[#9A8877]">
            {currentMode === 'frontdesk' ? 'FRONTDESK MODE' : 'BACKOFFICE MODE'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className={`rounded-full border border-[#E2DCD0] bg-white p-2.5 text-[#4A3B32] shadow-sm md:hidden ${interactionMotion.subtleButton}`}
              aria-label="登出"
            >
              <LogOut size={20} />
            </button>
          )}
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncStatus === 'syncing'}
              className={`rounded-full border border-[#E2DCD0] bg-white p-2.5 shadow-sm md:hidden ${interactionMotion.subtleButton} ${
                syncStatus === 'offline' ? 'border-red-300 bg-red-50' : ''
              } ${syncStatus === 'synced' ? 'border-green-300 bg-green-50' : ''}`}
              aria-label="同步資料"
            >
              {syncStatus === 'offline' && <CloudOff size={20} className="text-red-500" />}
              {syncStatus === 'syncing' && <Loader2 size={20} className="animate-spin text-[#8C7A6B]" />}
              {syncStatus === 'synced' && <CheckCircle2 size={20} className="text-green-600" />}
              {syncStatus === 'online' && <Upload size={20} className="text-[#4A3B32]" />}
            </button>
          )}
          <button
            type="button"
            onClick={onCalcOpen}
            className={`rounded-full border border-[#E2DCD0] bg-white p-2.5 text-[#4A3B32] shadow-sm md:hidden ${interactionMotion.subtleButton}`}
            aria-label="開啟計算機"
          >
            <Calculator size={20} />
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[460px]">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {visibleModeOptions.map((mode) => {
            const isActive = currentMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onModeChange(mode.id)}
                className={`min-w-[148px] rounded-[20px] border px-4 py-3 text-left ${interactionMotion.subtleButton} ${
                  isActive
                    ? 'border-[#4A3B32] bg-[#4A3B32] text-[#FCFAF5] shadow-md shadow-[#4A3B32]/10'
                    : 'border-[#DCCFC0] bg-[#F8F4EC] text-[#4A3B32] hover:border-[#4A3B32]/30 hover:bg-white'
                }`}
              >
                <div className="text-sm font-black tracking-[0.16em]">{mode.label}</div>
                <div
                  className={`mt-1 text-xs font-bold ${
                    isActive ? 'text-[#F2E7D8]' : 'text-[#8C7A6B]'
                  }`}
                >
                  {mode.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative flex w-full items-center">
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 z-10 flex items-center pr-2">
              <div className="animate-pulse rounded-full bg-[#4A3B32]/10 p-0.5">
                <ChevronLeft className="h-4 w-4 text-[#8C7A6B]" />
              </div>
            </div>
          )}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="hide-scrollbar flex w-full space-x-2 overflow-x-auto pb-2 md:pb-0"
          >
            {visibleTabs.map((view) => {
              const isActive = currentView === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => onViewChange(view.id)}
                  className={`whitespace-nowrap rounded-full border px-6 py-3 text-xl font-black ${interactionMotion.subtleButton} ${
                    isActive
                      ? 'border-[#4A3B32] bg-[#4A3B32] text-[#FCFAF5] shadow-md shadow-[#4A3B32]/10'
                      : 'border-transparent bg-transparent text-[#4A3B32] hover:bg-[#E2DCD0]/40'
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 z-10 flex items-center pl-2">
              <div className="animate-pulse rounded-full bg-[#4A3B32]/10 p-0.5">
                <ChevronRight className="h-4 w-4 text-[#8C7A6B]" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        {userEmail && (
          <div className="max-w-[220px] truncate rounded-full border border-[#E2DCD0] bg-white px-4 py-3 text-sm font-black text-[#6F6257] shadow-sm">
            {userEmail}
          </div>
        )}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className={`flex items-center rounded-full border border-[#E2DCD0] bg-white px-5 py-3 font-bold text-[#4A3B32] shadow-sm hover:shadow-md ${interactionMotion.button}`}
          >
            <LogOut size={18} className="mr-2 text-[#9A4F44]" /> 登出
          </button>
        )}
        {onSyncNow && (
          <button
            type="button"
            onClick={onSyncNow}
            disabled={syncStatus === 'syncing'}
            className={`flex items-center rounded-full border px-5 py-3 font-bold shadow-sm hover:shadow-md ${interactionMotion.button} ${
              syncStatus === 'offline'
                ? 'border-red-300 bg-red-50 text-red-600'
                : syncStatus === 'synced'
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-[#E2DCD0] bg-white text-[#4A3B32]'
            }`}
          >
            {syncStatus === 'offline' && <><CloudOff size={20} className="mr-2" /> 離線</>}
            {syncStatus === 'syncing' && <><Loader2 size={20} className="mr-2 animate-spin" /> 同步中...</>}
            {syncStatus === 'synced' && <><CheckCircle2 size={20} className="mr-2" /> 已同步</>}
            {syncStatus === 'online' && <><Upload size={20} className="mr-2 text-[#C75D4E]" /> 同步資料</>}
          </button>
        )}
        <button
          type="button"
          onClick={onCalcOpen}
          className={`flex items-center rounded-full border border-[#E2DCD0] bg-white px-6 py-3 font-bold text-[#4A3B32] shadow-sm hover:shadow-md ${interactionMotion.button}`}
        >
          <Calculator size={20} className="mr-2 text-[#C75D4E]" /> 計算機
        </button>
      </div>
    </div>
  );
};
