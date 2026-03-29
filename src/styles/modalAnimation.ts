export const modalAnimation = {
  base: 'transform-gpu will-change-[transform,opacity] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
  enter: 'opacity-100 scale-100 translate-y-0',
  exit: 'opacity-0 scale-[0.98] translate-y-2',
};

export const backdropAnimation = {
  base: 'will-change-opacity transition-opacity duration-300 ease-out',
  enter: 'opacity-100',
  exit: 'opacity-0',
};

export const modalShell = {
  overlay:
    'fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4',
  backdrop: 'absolute inset-0 bg-[#2A211B]/40 backdrop-blur-[8px]',
  panel:
    'relative w-full border border-[#E2DCD0] bg-white shadow-[0_28px_90px_rgba(58,43,31,0.18)] overflow-hidden',
  centeredPanel: 'max-h-[92dvh] rounded-t-[36px] md:rounded-[40px]',
  compactPanel: 'max-h-[88dvh] rounded-[32px]',
};
