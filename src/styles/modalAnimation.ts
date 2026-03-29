export const modalAnimation = {
  base: 'transform-gpu transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform]',
  enter: 'opacity-100 translate-y-0',
  exit: 'opacity-0 translate-y-4',
};

export const backdropAnimation = {
  base: 'transition-opacity duration-300 ease-out will-change-opacity',
  enter: 'opacity-100',
  exit: 'opacity-0',
};

export const modalShell = {
  overlay:
    'fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden',
  backdrop: 'absolute inset-0 bg-[#2A211B]/35 backdrop-blur-[6px]',
  panel:
    'relative w-full border border-[#E2DCD0] bg-white shadow-[0_28px_90px_rgba(58,43,31,0.18)] backface-hidden',
  centeredPanel: 'max-h-[92dvh] rounded-t-[36px] md:rounded-[40px]',
  compactPanel: 'max-h-[88dvh] rounded-[32px]',
};
