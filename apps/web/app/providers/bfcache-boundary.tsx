"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";

/**
 * bfcache 秒回边界。
 *
 * 本站大量 UI 依赖「SSR 出占位 → 一次性客户端 effect 揭示」（导航淡入、图片骨架
 * 翻转、next/dynamic ssr:false 列表、各处 onClick）。从浏览器前进/后退缓存恢复时
 * （pageshow.persisted=true）这些 effect 不会重跑，页面会卡在揭示前的骨架/隐藏态。
 *
 * 这里不走整页 location.reload()，而是递增 key 让 children 子树「软重挂载」：
 * 所有揭示 effect 重新运行、useState 重置后再正常揭示，等价于一次纯客户端的软刷新
 * ——不发任何网络请求、不重新下载、毫秒级完成，因而是真正的「秒回」。
 *
 * 可行前提：pageshow 监听器在正常 hydration 时注册，会随页面一起存入 bfcache，
 * 恢复时照常触发（已由 reload 兜底版本实测验证），故在其中 setState 同样可触发重挂载。
 */
export function BfcacheBoundary({ children }: { children: ReactNode }) {
  const [restoreNonce, setRestoreNonce] = useState(0);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setRestoreNonce((nonce) => nonce + 1);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Fragment 换 key 触发子树整体重挂载，且自身不产生 DOM 节点，不影响外层 flex 布局。
  return <Fragment key={restoreNonce}>{children}</Fragment>;
}
