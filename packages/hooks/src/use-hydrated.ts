"use client";

import { useEffect, useState } from "react";

/**
 * 标记组件是否已完成客户端 hydration。
 * 用于避免 SSR 与首帧 CSR 因 Date.now()、localStorage 等产生不一致。
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
