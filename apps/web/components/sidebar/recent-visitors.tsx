"use client";

import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import type { Visitor } from "../../app/_mock/types";
import { formatRelativeTime } from "../../lib/format-time";

interface RecentVisitorsProps {
  visitors: Visitor[];
}

export function RecentVisitors({ visitors }: RecentVisitorsProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-[14px] border border-border bg-card p-[15px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-(--fg3)">
        {t("sidebar.recentVisitors")}
      </h3>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {visitors.slice(0, 9).map((visitor) => {
          const isOnline = Date.now() - visitor.visitedAt.getTime() < 3 * 60 * 1000;

          return (
            <div
              key={visitor.id}
              data-testid="visitor-item"
              className="flex cursor-pointer select-none flex-col items-center gap-1 rounded-[10px] p-2 transition-[background,transform] hover:bg-primary/10 active:scale-95"
            >
              <UserAvatar src={visitor.avatar} name={visitor.name} size="xl" />

              <span className="mt-1 w-full truncate text-center text-xs font-semibold text-foreground">
                {visitor.name}
              </span>
              <div className="flex w-full items-center justify-center">
                {isOnline ? (
                  <span className="flex items-center gap-1 truncate text-[10px] font-semibold text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    在线
                  </span>
                ) : (
                  <span className="truncate text-[10px] text-(--fg3)">
                    {formatRelativeTime(visitor.visitedAt)}来过
                  </span>
                )}
              </div>
            </div>
          );
        })}
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
