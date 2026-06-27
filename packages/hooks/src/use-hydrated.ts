"use client";

import { useEffect, useState } from "react";

/** 全页完成首次 hydration 后，虚拟滚动 remount 不再回退到「未 hydrated」占位。 */
let globalHydrated = false;

/** 仅供测试隔离全局 hydration 状态 */
export function resetHydratedStateForTests(): void {
  globalHydrated = false;
}

/**
 * 标记组件是否已完成客户端 hydration。
 * 用于避免 SSR 与首帧 CSR 因 Date.now()、localStorage 等产生不一致。
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => globalHydrated);

  useEffect(() => {
    globalHydrated = true;
    setHydrated(true);
  }, []);

  return globalHydrated || hydrated;
}
