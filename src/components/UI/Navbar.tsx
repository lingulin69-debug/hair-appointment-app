import React from 'react';
import { Calculator } from 'lucide-react';
import { interactionMotion } from '../../styles/interactionMotion';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onCalcOpen: () => void;
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
}) => {
  return (
    <div className="z-10 flex shrink-0 flex-col justify-between gap-4 border-b border-[#E2DCD0] bg-white/50 px-4 py-4 backdrop-blur-md md:h-[100px] md:flex-row md:items-center md:px-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-3xl font-black tracking-widest text-[#4A3B32]">
          <span className="ml-1 text-lg font-mono tracking-wider text-[#8C7A6B]">
            Amy.SALON
          </span>
        </div>

        <button
          type="button"
          onClick={onCalcOpen}
          className={`rounded-full border border-[#E2DCD0] bg-white p-2.5 text-[#4A3B32] shadow-sm md:hidden ${interactionMotion.subtleButton}`}
          aria-label="開啟計算機"
        >
          <Calculator size={20} />
        </button>
      </div>

      <div className="hide-scrollbar flex w-full space-x-2 overflow-x-auto pb-2 md:w-auto md:pb-0">
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

      <div className="hidden items-center md:flex">
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
