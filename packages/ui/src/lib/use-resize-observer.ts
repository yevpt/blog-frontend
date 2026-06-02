import { useEffect, type RefObject } from "react";

type UseResizeObserverOptions<T> = {
  ref: RefObject<T | null | undefined> | undefined;
  box?: ResizeObserverBoxOptions;
  onResize: () => void;
};

export function useResizeObserver<T extends Element>(options: UseResizeObserverOptions<T>) {
  const { ref, box, onResize } = options;

  useEffect(() => {
    const element = ref?.current;
    if (!element) return;

    if (typeof window.ResizeObserver === "undefined") {
      window.addEventListener("resize", onResize, false);
      return () => window.removeEventListener("resize", onResize, false);
    }

    const observer = new window.ResizeObserver((entries) => {
      if (entries.length) onResize();
    });
    observer.observe(element, { box });
    return () => observer.unobserve(element);
  }, [onResize, ref, box]);
}
