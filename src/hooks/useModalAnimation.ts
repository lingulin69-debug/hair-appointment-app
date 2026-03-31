import { useEffect, useState } from 'react';

export function useModalAnimation(isOpen: boolean, duration = 300) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    if (isOpen) {
      setShouldRender(true);
      // We need a tiny delay to allow the component to be added to the DOM
      // before we trigger the animation by setting isVisible to true.
      // A requestAnimationFrame would also work here.
      timerId = setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      timerId = setTimeout(() => setShouldRender(false), duration);
    }

    return () => {
      clearTimeout(timerId);
    };
  }, [isOpen, duration]);

  return { shouldRender, isVisible };
}
