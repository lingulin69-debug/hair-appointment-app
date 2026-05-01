import React, { useEffect, useState } from 'react';
import { Delete, X } from 'lucide-react';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  backdropAnimation,
  modalAnimation,
  modalShell,
} from '../../styles/modalAnimation';
import { interactionMotion } from '../../styles/interactionMotion';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRevenue?: (amount: number) => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onSaveRevenue,
}) => {
  const { shouldRender, isVisible } = useModalAnimation(isOpen);
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplay('0');
      setPrevValue(null);
      setOperation(null);
      setShouldResetDisplay(false);
    }
  }, [isOpen]);

  const handleNumber = (num: string) => {
    if (shouldResetDisplay) {
      setDisplay(num);
      setShouldResetDisplay(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (shouldResetDisplay) {
      setDisplay('0.');
      setShouldResetDisplay(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b !== 0 ? a / b : 0;
      default:
        return b;
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);

    if (prevValue !== null && operation && !shouldResetDisplay) {
      const result = calculate(prevValue, currentValue, operation);
      setDisplay(result.toString());
      setPrevValue(result);
    } else {
      setPrevValue(currentValue);
    }

    setOperation(op);
    setShouldResetDisplay(true);
  };

  const handleEquals = () => {
    if (prevValue !== null && operation) {
      const currentValue = parseFloat(display);
      const result = calculate(prevValue, currentValue, operation);
      setDisplay(result.toString());
      setPrevValue(null);
      setOperation(null);
      setShouldResetDisplay(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setShouldResetDisplay(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleSave = () => {
    const amount = parseFloat(display);
    if (!Number.isNaN(amount) && amount > 0) {
      onSaveRevenue?.(amount);
      onClose();
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={modalShell.overlay}>
      <div
        className={`${modalShell.backdrop} ${backdropAnimation.base} ${
          isVisible ? backdropAnimation.enter : backdropAnimation.exit
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      />

      <div
        className={`${modalShell.panel} ${modalShell.compactPanel} w-full max-w-sm overflow-hidden bg-[#FCFAF5] ${modalAnimation.base} ${
          isVisible ? modalAnimation.enter : modalAnimation.exit
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#E8E3D8] p-4">
          <h2 className="text-xl font-bold text-[#4A3B32]">計算機</h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 hover:bg-[#E8E3D8] ${interactionMotion.subtleButton}`}
            aria-label="關閉計算機"
          >
            <X className="h-5 w-5 text-[#4A3B32]" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-[#F4F0EA] to-[#FCFAF5] p-6">
          <div className="min-h-[3rem] break-all text-right text-4xl font-bold text-[#4A3B32]">
            {display}
          </div>
          {operation && (
            <div className="mt-2 text-right text-sm text-[#7A6B5D]">
              {prevValue} {operation}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 p-4">
          <Button
            onClick={handleClear}
            className="border border-[#E8E3D8] bg-white text-[#C75D4E]"
          >
            清除
          </Button>
          <Button onClick={handleBackspace} className="bg-[#E8E3D8] text-[#4A3B32]">
            <Delete className="mx-auto h-5 w-5" />
          </Button>
          <Button onClick={() => handleOperation('÷')} className="bg-[#8B7355] text-white">
            ÷
          </Button>
          <Button onClick={() => handleOperation('×')} className="bg-[#8B7355] text-white">
            ×
          </Button>

          <Button onClick={() => handleNumber('7')}>7</Button>
          <Button onClick={() => handleNumber('8')}>8</Button>
          <Button onClick={() => handleNumber('9')}>9</Button>
          <Button onClick={() => handleOperation('-')} className="bg-[#8B7355] text-white">
            -
          </Button>

          <Button onClick={() => handleNumber('4')}>4</Button>
          <Button onClick={() => handleNumber('5')}>5</Button>
          <Button onClick={() => handleNumber('6')}>6</Button>
          <Button onClick={() => handleOperation('+')} className="bg-[#8B7355] text-white">
            +
          </Button>

          <Button onClick={() => handleNumber('1')}>1</Button>
          <Button onClick={() => handleNumber('2')}>2</Button>
          <Button onClick={() => handleNumber('3')}>3</Button>
          <Button onClick={handleEquals} className="row-span-2 bg-[#4A3B32] text-white">
            =
          </Button>

          <Button onClick={() => handleNumber('0')} className="col-span-2">
            0
          </Button>
          <Button onClick={handleDecimal}>.</Button>
        </div>

        {onSaveRevenue && (
          <div className="border-t border-[#E8E3D8] p-4">
            <button
              type="button"
              onClick={handleSave}
              className={`w-full rounded-2xl bg-[#4A3B32] py-3 font-bold text-white ${interactionMotion.button}`}
            >
              儲存金額
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold md:h-16 md:w-16
        ${interactionMotion.subtleButton} active:shadow-inner
        ${
          className ||
          'border border-[#E8E3D8] bg-white text-[#4A3B32] shadow-sm hover:bg-[#F4F0EA]'
        }
      `}
    >
      {children}
    </button>
  );
};

export default CalculatorModal;
