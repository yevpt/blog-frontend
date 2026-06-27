"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const FALLBACK_PATH = "/";

// 模块级：跨软导航持久，硬刷新/直接落地时随模块重新初始化为 null。
// 记录「本次页面加载的落地页路径」，即返回的「地板」。
let entryPath: string | null = null;

/** 读取浏览器 Navigation API 的 canGoBack；不支持时返回 undefined。 */
function readCanGoBack(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  const candidate = (window as unknown as { navigation?: { canGoBack?: boolean } }).navigation;
  if (candidate && typeof candidate.canGoBack === "boolean") return candidate.canGoBack;
  return undefined;
}

/**
 * 移动端返回按钮的导航决策：
 * 1. 浏览器支持 Navigation API → 用内核权威信号 canGoBack 决定真返回还是兜底。
 * 2. 否则启发式 → 停在落地页（或尚未捕获）兜底首页，已离开落地页则真返回。
 */
export function useBackNavigation(): () => void {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (entryPath === null) entryPath = pathname;
  }, [pathname]);

  return useCallback(() => {
    const canGoBack = readCanGoBack();
    if (canGoBack !== undefined) {
      if (canGoBack) router.back();
      else router.push(FALLBACK_PATH);
      return;
    }

    if (entryPath === null || pathname === entryPath) {
      router.push(FALLBACK_PATH);
      return;
    }
    router.back();
  }, [router, pathname]);
}
