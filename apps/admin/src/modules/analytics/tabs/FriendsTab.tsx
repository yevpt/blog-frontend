import { useCallback } from "react";
import { Card, CardContent } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import type { AnalyticsDateRange } from "../hooks/use-analytics-range";

interface FriendsTabProps {
  range: AnalyticsDateRange;
}

export function FriendsTab({ range }: FriendsTabProps) {
  const fetcher = useCallback(
    () => apiClient.analytics.getFriendLinks({ limit: 30, ...range }),
    [range],
  );
  const { data, loading } = useAnalyticsData(fetcher, [range.from, range.to], []);

  return (
    <Card>
      <CardContent className="pt-5">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted">加载中…</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted">
            暂无友链入站数据（友链需配置且有访客经其跳入）
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between border-b border-border pb-2 text-xs text-text-muted">
              <span>友链</span>
              <span className="flex shrink-0 gap-6 pl-3">
                <span className="w-12 text-right">浏览量</span>
                <span className="w-12 text-right">访客</span>
                <span className="w-16 text-right">入站占比</span>
              </span>
            </div>
            {data.map((link) => (
              <div
                key={link.friend_link_id}
                className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0"
              >
                <span className="min-w-0 truncate pr-3">
                  <span className="text-text-primary">{link.friend_name}</span>
                  <span className="ml-2 text-text-muted">{link.site_host}</span>
                </span>
                <span className="flex shrink-0 gap-6 text-text-secondary">
                  <span className="w-12 text-right">{link.pv.toLocaleString()}</span>
                  <span className="w-12 text-right">{link.uv.toLocaleString()}</span>
                  <span className="w-16 text-right">{(link.inbound_rate * 100).toFixed(1)}%</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
