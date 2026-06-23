import { useCallback, useLayoutEffect, useState } from "react";

/** 监听源元素高度，供另一侧元素在桌面双栏时对齐使用。 */
export function useSyncedElementHeight(enabled: boolean) {
  const [sourceElement, setSourceElement] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState<number>();

  const ref = useCallback((node: HTMLElement | null) => {
    setSourceElement(node);
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !sourceElement) {
      setHeight(undefined);
      return;
    }

    const measure = () => {
      setHeight(Math.round(sourceElement.getBoundingClientRect().height));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(sourceElement);

    const fontsReady = document.fonts?.ready;
    void fontsReady?.then(measure);

    return () => observer.disconnect();
  }, [enabled, sourceElement]);

  return { ref, height };
}
