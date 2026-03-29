export const interactionMotion = {
  button:
    'transform-gpu will-change-transform transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  subtleButton:
    'transform-gpu will-change-transform transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-0 active:scale-[0.98]',
  card:
    'transform-gpu will-change-[transform,box-shadow] transition-[transform,box-shadow] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(74,59,50,0.08)]',
  surface:
    'transform-gpu will-change-transform transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]',
  // Optimized for touch devices - faster response
  tap: 'transform-gpu transition-transform duration-100 ease-out active:scale-[0.97]',
};
