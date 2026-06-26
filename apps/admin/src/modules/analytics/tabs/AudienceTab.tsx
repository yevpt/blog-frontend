import { useCallback, useMemo, useState } from "react";
import type { AnalyticsDimension } from "@repo/api";
import { Card, CardContent } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import { SegToggle } from "../components/SegToggle";
import { BarList, type BarListItem } from "../components/BarList";
import type { AnalyticsDateRange } from "../hooks/use-analytics-range";

const DIMS: { id: AnalyticsDimension; label: string }[] = [
  { id: "referer_type", label: "来源" },
  { id: "device", label: "设备" },
  { id: "browser", label: "浏览器" },
  { id: "os", label: "系统" },
  { id: "country", label: "地区" },
];

const REFERER_LABELS: Record<string, string> = {
  direct: "直接访问",
  search: "搜索引擎",
  social: "社交媒体",
  external: "外部链接",
  internal: "站内跳转",
};

interface AudienceTabProps {
  range: AnalyticsDateRange;
}

export function AudienceTab({ range }: AudienceTabProps) {
  const [dim, setDim] = useState<AnalyticsDimension>("referer_type");
  const fetcher = useCallback(() => apiClient.analytics.getDimensions(dim, range), [dim, range]);
  const { data, loading } = useAnalyticsData(fetcher, [dim, range.from, range.to], []);

  const items: BarListItem[] = useMemo(() => {
    const agg = new Map<string, number>();
    for (const row of data) {
      agg.set(row.dim_value, (agg.get(row.dim_value) ?? 0) + row.pv);
    }
    return [...agg.entries()]
      .map(([key, value]) => ({
        label: dim === "referer_type" ? (REFERER_LABELS[key] ?? key) : key || "未知",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [data, dim]);

  return (
    <div className="grid gap-4">
      <SegToggle options={DIMS} value={dim} onChange={setDim} />
      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted">加载中…</div>
          ) : (
            <BarList items={items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
