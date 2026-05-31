"use client";

import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import type { Visitor } from "../../app/_mock/types";

interface RecentVisitorsProps {
  visitors: Visitor[];
}

/**
 * 将来访时间格式化为相对时间字符串。
 * 与 snippet-card.tsx 中的 formatRelativeTime 逻辑一致，此处内联实现。
 */
function formatVisitTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = 30 * DAY;
  const YEAR = 12 * MONTH;

  if (diff < MINUTE) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < MONTH) return `${Math.floor(diff / DAY)} 天前`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)} 个月前`;
  return `${Math.floor(diff / YEAR)} 年前`;
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
              <span className="opacity-70">{formatVisitTime(visitor.visitedAt)}</span>
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
