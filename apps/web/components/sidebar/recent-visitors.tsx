"use client";

import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import { BaseUserCard } from "@/components/common/base-user-card";
import { SidebarSectionHeader } from "@/components/sidebar";
import type { Visitor } from "../../app/_mock/types";

interface RecentVisitorsProps {
  visitors: Visitor[];
}

export function RecentVisitors({ visitors }: RecentVisitorsProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-2xl bg-card shadow-card">
      <SidebarSectionHeader title={t("sidebar.recentVisitors")} />

      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
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

      <div className="flex gap-2 px-4 pb-[15px]">
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
