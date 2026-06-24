import { type RefObject, useLayoutEffect } from "react";

const XL_MEDIA_QUERY = "(min-width: 1280px)";
const MAIN_BOTTOM_GAP_PX = 24;

function clearMainInlineSize(main: HTMLElement | null) {
  main?.style.removeProperty("height");
  main?.style.removeProperty("min-height");
}

/** 桌面双栏：主区域高度 = max(顶栏以下可用视口, 右栏自然高度)，避免正文把页面撑高。 */
export function useArticleEditorMainLayout({
  enabled,
  layoutRef,
  railRef,
  mainRef,
}: {
  enabled: boolean;
  layoutRef: RefObject<HTMLElement | null>;
  railRef: RefObject<HTMLElement | null>;
  mainRef: RefObject<HTMLElement | null>;
}) {
  useLayoutEffect(() => {
    if (!enabled) {
      clearMainInlineSize(mainRef.current);
      return;
    }

    const update = () => {
      const main = mainRef.current;
      if (!main) return;

      if (!window.matchMedia(XL_MEDIA_QUERY).matches) {
        clearMainInlineSize(main);
        return;
      }

      const layout = layoutRef.current;
      if (!layout) return;

      const topHeight = layout.firstElementChild?.getBoundingClientRect().height ?? 0;
      const layoutTop = layout.getBoundingClientRect().top;
      const available = Math.max(
        0,
        Math.round(window.innerHeight - layoutTop - topHeight - MAIN_BOTTOM_GAP_PX),
      );
      const railHeight = Math.round(railRef.current?.getBoundingClientRect().height ?? 0);
      const mainHeight = Math.max(available, railHeight);

      main.style.height = `${mainHeight}px`;
      main.style.minHeight = `${available}px`;
    };

    update();

    const observer = new ResizeObserver(update);
    const topSection = layoutRef.current?.firstElementChild;
    if (topSection) observer.observe(topSection);
    if (layoutRef.current) observer.observe(layoutRef.current);
    if (railRef.current) observer.observe(railRef.current);

    window.addEventListener("resize", update);
    void document.fonts?.ready.then(update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      clearMainInlineSize(mainRef.current);
    };
  }, [enabled, layoutRef, mainRef, railRef]);
}
