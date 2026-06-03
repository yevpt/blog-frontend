"use client";

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
    <section className="rounded-[14px] border border-border bg-card p-[15px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--fg3)]">
        {t("sidebar.recentVisitors")}
      </h3>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {visitors.slice(0, 10).map((visitor) => (
          <div
            key={visitor.id}
            data-testid="visitor-item"
            className="-mx-2 -my-1.5 flex min-w-0 cursor-pointer select-none items-center gap-2 rounded-[10px] px-2 py-1.5 transition-[background,transform] hover:bg-primary/10 active:scale-95"
          >
            <img
              src={visitor.avatar}
              alt={visitor.name}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-foreground">
                {visitor.name}
              </span>
              <span
                className={
                  visitor.isOnline
                    ? "mt-0.5 block truncate text-[10px] font-semibold text-emerald-500"
                    : "mt-0.5 block truncate text-[10px] text-[var(--fg3)]"
                }
              >
                {visitor.isOnline ? "在线" : formatRelativeTime(visitor.visitedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full text-[11px]">
          {t("sidebar.joinQQ")}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 flex-1 rounded-full text-[11px]">
          {t("sidebar.viewMore")}
        </Button>
      </div>
    </section>
  );
}
