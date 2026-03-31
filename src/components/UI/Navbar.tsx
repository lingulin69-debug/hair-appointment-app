import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calculator, ChevronLeft, ChevronRight, CloudOff, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { interactionMotion } from '../../styles/interactionMotion';

type SyncStatus = 'online' | 'syncing' | 'synced' | 'offline';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onCalcOpen: () => void;
  syncStatus?: SyncStatus;
  onSyncNow?: () => void;
}

const tabs = [
  { id: 'calendar', label: '日曆' },
  { id: 'clients', label: '顧客目錄' },
  { id: 'services', label: '服務與商品' },
  { id: 'dashboard', label: '預約統計' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  onCalcOpen,
  syncStatus = 'online',
  onSyncNow,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
  }, [checkScroll]);

  return (
    <div className="z-10 flex shrink-0 flex-col justify-between gap-4 border-b border-[#E2DCD0] bg-white/50 px-4 py-4 backdrop-blur-md md:h-[100px] md:flex-row md:items-center md:px-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-3xl font-black tracking-widest text-[#4A3B32]">
          <span className="ml-1 text-2xl font-mono tracking-wider text-[#8C7A6B]">
            Amy.SALON
          </span>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="relative flex w-full items-center md:w-auto">
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
          className="hide-scrollbar flex w-full space-x-2 overflow-x-auto pb-2 md:w-auto md:pb-0"
        >
        {tabs.map((view) => {
          const isActive = currentView === view.id;

          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onViewChange(view.id)}
              className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-lg font-bold ${interactionMotion.subtleButton} ${
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

      <div className="hidden items-center gap-3 md:flex">
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
