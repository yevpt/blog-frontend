"use client";

import { useEffect } from "react";

/**
 * bfcache（前进/后退缓存）恢复兜底。
 *
 * 本站大量 UI 依赖「SSR 出占位 → 一次性客户端 effect 揭示」的模式（导航淡入、
 * 图片骨架翻转、next/dynamic ssr:false 列表、各处 onClick 等）。当浏览器从前进/
 * 后退缓存恢复页面时，这些 effect 不会重新运行、onLoad 不会重新触发，页面会卡在
 * 揭示前的骨架/隐藏态且失去交互。
 *
 * pageshow 的 event.persisted 为 true 即代表「页面由 bfcache 恢复」。此时强制整页
 * 刷新，回到一次干净的 SSR + hydration，是对所有揭示模式都生效的统一兜底。
 */
export function BfcacheRecovery() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
