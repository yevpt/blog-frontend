"use client";

import { useEffect } from "react";

const LIKE_COUNT_FLOAT_MS = 720;

interface ArticleLikeCountFloatProps {
  count: number;
  onComplete: () => void;
}

function formatLikeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** 点赞成功时于按钮上方浮现最新点赞数（挂载即播放，结束后卸载） */
export function ArticleLikeCountFloat({ count, onComplete }: ArticleLikeCountFloatProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, LIKE_COUNT_FLOAT_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      data-testid="like-count-float"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-0.5 -translate-x-1/2"
      aria-hidden
    >
      <span className="block animate-like-count-float text-[11px] font-semibold leading-none tabular-nums text-rose-500">
        {formatLikeCount(count)}
      </span>
    </div>
  );
}
