import { useCallback } from "react";
import { Card, CardContent } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import type { AnalyticsDateRange } from "../hooks/use-analytics-range";

interface PagesTabProps {
  range: AnalyticsDateRange;
}

export function PagesTab({ range }: PagesTabProps) {
  const fetcher = useCallback(() => apiClient.analytics.getPages({ limit: 30, ...range }), [range]);
  const { data, loading } = useAnalyticsData(fetcher, [range.from, range.to], []);

  return (
    <Card>
      <CardContent className="pt-5">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">加载中…</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          <div className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-2 text-xs text-muted-foreground">
              <span>页面</span>
              <span className="flex shrink-0 gap-8 pl-3">
                <span className="w-14 text-right">浏览量</span>
                <span className="w-14 text-right">访客</span>
              </span>
            </div>
            {data.map((page, idx) => (
              <div
                key={`${page.path}-${idx}`}
                className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0"
              >
                <span className="min-w-0 truncate pr-3">
                  <span className="text-foreground">{page.title || page.path}</span>
                  <span className="ml-2 text-muted-foreground">{page.path}</span>
                </span>
                <span className="flex shrink-0 gap-8 text-foreground/70">
                  <span className="w-14 text-right">{page.pv.toLocaleString()}</span>
                  <span className="w-14 text-right">{page.uv.toLocaleString()}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
