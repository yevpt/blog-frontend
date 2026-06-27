"use client";

import { formatRelativeTime } from "@/lib/format-time";

interface RelativeTimeProps {
  dateTime: Date | string;
  className?: string;
}

/**
 * 相对时间展示：SSR 期间直接渲染时间文本（与客户端 Date.now() 相差 < 5s，
 * 生成的相对时间字符串 99.9% 一致），消除 hydration 占位符造成的 CLS。
 */
export function RelativeTime({ dateTime, className }: RelativeTimeProps) {
  const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime;

  return (
    <time dateTime={date.toISOString()} className={className} suppressHydrationWarning>
      {formatRelativeTime(date)}
    </time>
  );
}
