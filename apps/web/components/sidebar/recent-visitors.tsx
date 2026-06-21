"use client";

import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import { BaseUserCard } from "@/components/common/base-user-card";
import type { Visitor } from "../../app/_mock/types";

interface RecentVisitorsProps {
  visitors: Visitor[];
}

export function RecentVisitors({ visitors }: RecentVisitorsProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-2xl bg-card p-[15px] shadow-card">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-(--fg3)">
        {t("sidebar.recentVisitors")}
      </h3>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {visitors.slice(0, 9).map((visitor) => (
          <BaseUserCard
            key={visitor.id}
            user={{
              id: visitor.id,
              nickname: visitor.name,
              avatar_url: visitor.avatar,
              last_login_at: visitor.visitedAt,
              roles: [],
            }}
            variant="compact"
            data-testid="visitor-item"
          />
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
