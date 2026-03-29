import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
  window.requestAnimationFrame = (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 16);
}

if (typeof window !== 'undefined' && !window.cancelAnimationFrame) {
  window.cancelAnimationFrame = (handle: number) => {
    window.clearTimeout(handle);
  };
}
