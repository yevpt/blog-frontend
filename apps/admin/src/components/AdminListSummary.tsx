import type { ReactNode } from "react";
import { cn } from "@repo/ui";

interface AdminListSummaryProps {
  visibleCount: number;
  secondary?: ReactNode;
  className?: string;
}

/** 后台列表卡片底部统计栏 */
export function AdminListSummary({ visibleCount, secondary, className }: AdminListSummaryProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="whitespace-nowrap">共 {visibleCount} 条</span>
      {secondary ? <span className="truncate text-right">{secondary}</span> : null}
    </div>
  );
}
