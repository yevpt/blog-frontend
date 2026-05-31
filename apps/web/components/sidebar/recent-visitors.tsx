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
    <section className="rounded-xl border border-border/50 p-4">
      <h3 className="text-sm font-semibold mb-3">{t("sidebar.recentVisitors")}</h3>

      {/* 3×3 头像网格，最多显示 9 人 */}
      <div className="grid grid-cols-3 gap-2">
        {visitors.slice(0, 9).map((visitor) => (
          <div key={visitor.id} className="relative group">
            <img
              src={visitor.avatar}
              alt={visitor.name}
              className="w-full aspect-square rounded-lg object-cover"
            />
            {/* Tooltip：hover 时显示昵称 + 来访时间 */}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1
                          bg-foreground text-background text-xs rounded whitespace-nowrap
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200
                          pointer-events-none z-10"
            >
              {visitor.name}
              <br />
              <span className="opacity-70">{formatRelativeTime(visitor.visitedAt)}</span>
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
