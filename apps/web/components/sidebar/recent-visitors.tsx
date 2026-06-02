"use client";

import { cn } from "@repo/ui";
import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import type { Visitor } from "../../app/_mock/types";
import { formatRelativeTime } from "../../lib/format-time";

interface RecentVisitorsProps {
  visitors: Visitor[];
}

export function RecentVisitors({ visitors }: RecentVisitorsProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-xl border border-border/50 p-4">
      <h3 className="text-sm font-semibold mb-3">{t("sidebar.recentVisitors")}</h3>

      {/* 2 列访客网格，最多 10 人 */}
      <div className="grid grid-cols-2 gap-1">
        {visitors.slice(0, 10).map((visitor) => (
          <div
            key={visitor.id}
            className="flex items-center gap-2 p-1.5 rounded-xl cursor-pointer hover:bg-accent/10 active:scale-95 transition-all"
          >
            <img
              src={visitor.avatar}
              alt={visitor.name}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-foreground truncate block">
                {visitor.name}
              </span>
              <span
                className={cn(
                  "text-[10px] block truncate",
                  visitor.isOnline ? "text-emerald-500 font-semibold" : "text-muted-foreground",
                )}
              >
                {visitor.isOnline ? "在线" : `${formatRelativeTime(visitor.visitedAt)}来过`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" className="flex-1 text-xs">
          {t("sidebar.joinQQ")}
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-xs">
          {t("sidebar.viewMore")}
        </Button>
      </div>
    </section>
  );
}
