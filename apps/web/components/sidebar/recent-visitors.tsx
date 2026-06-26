"use client";

import { useLocale } from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import { BaseUserCard } from "@/components/common/base-user-card";
import {
  SidebarFooterButton,
  SidebarSectionFooter,
  SidebarSectionHeader,
} from "@/components/sidebar";
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
              is_online: visitor.isOnline,
              last_active_at: visitor.lastActiveAt,
              last_login_at: visitor.lastLoginAt,
              roles: [],
            }}
            variant="compact"
            data-testid="visitor-item"
          />
        ))}
      </div>

      <SidebarSectionFooter>
        <SidebarFooterButton
          tone="primary"
          href="https://jq.qq.com/?_wv=1027&k=Qo26kEUX"
          target="_blank"
          rel="noopener noreferrer"
        >
          <SvgIcon name="qq" size={12} />
          {t("sidebar.joinQQ")}
        </SidebarFooterButton>
        <SidebarFooterButton tone="ghost" href="/circle">
          {t("sidebar.viewMore")}
          <SvgIcon name="arrow-forward" size={12} />
        </SidebarFooterButton>
      </SidebarSectionFooter>
    </section>
  );
}
