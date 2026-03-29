import { useEffect, useRef, useState } from 'react';

export function useModalAnimation(isOpen: boolean, duration = 300) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const rafId = useRef<number | null>(null);
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleanup function to cancel any pending animations
    const cleanup = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (timerId.current !== null) {
        clearTimeout(timerId.current);
        timerId.current = null;
      }
    };

    if (isOpen) {
      cleanup();
      setShouldRender(true);
      // Use double RAF to ensure the DOM has painted before starting animation
      // This prevents layout thrashing and ensures smooth entry animation
      rafId.current = requestAnimationFrame(() => {
        rafId.current = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      cleanup();
      setIsVisible(false);
      timerId.current = setTimeout(() => setShouldRender(false), duration);
    }

    return cleanup;
  }, [isOpen, duration]);

  return { shouldRender, isVisible };
}
