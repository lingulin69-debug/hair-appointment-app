import React, { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';

interface Appointment {
  id: string;
  date: string;
}

interface MonthYearPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  appointments: Appointment[];
  onSelectDate: (year: number, month: number) => void;
}

export const MonthYearPickerModal: React.FC<MonthYearPickerModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  appointments,
  onSelectDate,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [selectedYear, setSelectedYear] = useState(currentYear);

  // 從預約中提取年份
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    appointments.forEach((appt) => {
      const year = new Date(appt.date).getFullYear();
      years.add(year);
    });
    // 加上當前年份和鄰近年份
    years.add(currentYear);
    years.add(currentYear - 1);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [appointments, currentYear]);

  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const handleMonthSelect = (monthIndex: number) => {
    onSelectDate(selectedYear, monthIndex);
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div className={modalShell.overlay}>
      <div
        className={`${modalShell.backdrop} ${backdropAnimation.base} ${
          isVisible ? backdropAnimation.enter : backdropAnimation.exit
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />
      <div
        className={`${modalShell.panel} ${modalShell.compactPanel} ${modalAnimation.base} ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        } w-full max-w-md overflow-hidden bg-[#FCFAF5]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E2DCD0]">
          <h2 className="text-xl font-bold text-[#4A3B32]">選擇年月</h2>
          <button
            onClick={onClose}
            className={`p-2 hover:bg-[#E8E3D8] rounded-full ${interactionMotion.subtleButton}`}
          >
            <X className="w-5 h-5 text-[#4A3B32]" />
          </button>
        </div>

        {/* Year Selector */}
        <div className="p-6 border-b border-[#E2DCD0]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              className={`p-2 hover:bg-[#E8E3D8] rounded-full ${interactionMotion.subtleButton}`}
            >
              <ChevronLeft className="w-5 h-5 text-[#4A3B32]" />
            </button>
            <span className="text-2xl font-black text-[#4A3B32]">{selectedYear} 年</span>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              className={`p-2 hover:bg-[#E8E3D8] rounded-full ${interactionMotion.subtleButton}`}
            >
              <ChevronRight className="w-5 h-5 text-[#4A3B32]" />
            </button>
          </div>
          {/* Available Years */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-bold ${interactionMotion.subtleButton}
                  ${selectedYear === year
                    ? 'bg-[#4A3B32] text-white'
                    : 'bg-white text-[#4A3B32] border border-[#E8E3D8] hover:border-[#4A3B32]'
                  }
                `}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Month Grid */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3">
            {months.map((month, index) => {
              const isCurrentMonth = selectedYear === currentYear && index === currentMonth;
              return (
                <button
                  key={index}
                  onClick={() => handleMonthSelect(index)}
                  className={`
                    py-3.5 rounded-xl font-bold ${interactionMotion.subtleButton}
                    ${isCurrentMonth
                      ? 'bg-[#C75D4E] text-white shadow-md'
                      : 'bg-white text-[#4A3B32] border border-[#E8E3D8] hover:bg-[#F4F0EA]'
                    }
                  `}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
