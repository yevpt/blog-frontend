"use client";

import { useLayoutEffect, useState } from "react";
import type { MomentPageResp } from "@repo/api";
import { MomentsList } from "./moments-list";
import { MomentsListFallback } from "./moments-list-fallback";

interface MomentsListLoaderProps {
  initialPage: MomentPageResp;
}

/**
 * 碎语列表客户端入口：
 * 服务端与 hydration 首帧只渲染 Fallback，挂载后再渲染瀑布流列表，
 * 避免 next/dynamic ssr:false 的 bailout 错误，同时防止列数闪烁。
 */
export function MomentsListLoader({ initialPage }: MomentsListLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <MomentsListFallback />;
  }

  return <MomentsList initialPage={initialPage} />;
}
