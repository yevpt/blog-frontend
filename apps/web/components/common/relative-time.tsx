"use client";

import { useHydrated } from "@repo/hooks";
import { formatRelativeTime } from "@/lib/format-time";

interface RelativeTimeProps {
  dateTime: Date | string;
  className?: string;
}

/** 相对时间展示：hydration 前占位，挂载后显示相对时间，避免 React #418 */
export function RelativeTime({ dateTime, className }: RelativeTimeProps) {
  const hydrated = useHydrated();
  const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime;

  return (
    <time dateTime={date.toISOString()} className={className} suppressHydrationWarning>
      {hydrated ? formatRelativeTime(date) : "\u00A0"}
    </time>
  );
}
