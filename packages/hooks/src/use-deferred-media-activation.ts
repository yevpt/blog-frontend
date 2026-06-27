import { useEffect, useState } from "react";

/** 页面 load 完成且主线程空闲后再执行（与正文/封面图片延迟加载策略一致）。 */
export function scheduleAfterPageReady(callback: () => void): () => void {
  let cancelled = false;

  const run = () => {
    if (cancelled) return;
    if ("requestIdleCallback" in window) {
      requestIdleCallback(
        () => {
          if (!cancelled) callback();
        },
        { timeout: 1500 },
      );
      return;
    }
    setTimeout(() => {
      if (!cancelled) callback();
    }, 0);
  };

  if (document.readyState === "complete") {
    run();
  } else {
    window.addEventListener("load", run, { once: true });
  }

  return () => {
    cancelled = true;
  };
}

/**
 * 全页仅首屏走 defer；虚拟滚动等 remount 直接读此标记，避免骨架层重播。
 * 进程内单例，不持久化。
 */
let globalMediaActivated = false;

/** 仅供测试隔离全局激活状态 */
export function resetDeferredMediaActivationForTests(): void {
  globalMediaActivated = false;
}

/** 首屏仅骨架占位，页面主体就绪后再允许挂载真实媒体；remount 时立即视为已就绪。 */
export function useDeferredMediaActivation(): boolean {
  const [activated, setActivated] = useState(() => globalMediaActivated);

  useEffect(() => {
    if (globalMediaActivated) return;
    return scheduleAfterPageReady(() => {
      globalMediaActivated = true;
      setActivated(true);
    });
  }, []);

  return globalMediaActivated || activated;
}

/** data:/blob: 等本地预览地址无需延迟。 */
export function shouldDeferRemoteMediaSrc(src: string | undefined): boolean {
  if (!src) return false;
  return !src.startsWith("data:") && !src.startsWith("blob:");
}
