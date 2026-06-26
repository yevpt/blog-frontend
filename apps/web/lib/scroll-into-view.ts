/** 平滑滚动结束后执行回调；无 scrollend 时用超时兜底（元素已在视口内时 scrollend 可能不触发）。 */
export function runAfterSmoothScroll(callback: () => void, fallbackMs = 400): void {
  let called = false;
  const run = () => {
    if (called) return;
    called = true;
    callback();
  };

  if ("onscrollend" in window) {
    window.addEventListener("scrollend", run, { once: true });
  }
  window.setTimeout(run, fallbackMs);
}

/** 将元素滚到视口内，避开 fixed 顶栏（默认 #navbar）。 */
export function scrollIntoViewBelowFixedHeader(
  element: HTMLElement,
  options?: {
    headerId?: string;
    gap?: number;
    behavior?: ScrollBehavior;
  },
): void {
  const { headerId = "navbar", gap = 12, behavior = "smooth" } = options ?? {};
  const header = document.getElementById(headerId);
  const headerHeight = header?.getBoundingClientRect().height ?? 0;
  const top = element.getBoundingClientRect().top + window.scrollY - headerHeight - gap;
  window.scrollTo({ top: Math.max(0, top), behavior });
}
