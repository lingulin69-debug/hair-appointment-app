import { useEffect, useRef, useState } from 'react';

export function useModalAnimation(isOpen: boolean, duration = 200) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const rafId = useRef<number>(0);
  const timerId = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Use double requestAnimationFrame to ensure the DOM has been painted
      // before triggering the enter animation, preventing initial flicker
      rafId.current = requestAnimationFrame(() => {
        rafId.current = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      timerId.current = setTimeout(() => setShouldRender(false), duration);
    }

    return () => {
      cancelAnimationFrame(rafId.current);
      clearTimeout(timerId.current);
    };
  }, [isOpen, duration]);

  return { shouldRender, isVisible };
}
