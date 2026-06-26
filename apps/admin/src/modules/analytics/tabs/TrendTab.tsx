import { useCallback, useState } from "react";
import type { AnalyticsMetric, AnalyticsSegment, AnalyticsTrendPoint } from "@repo/api";
import { Card, CardContent } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { TrendChart } from "../components/TrendChart";
import { SegToggle } from "../components/SegToggle";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import type { AnalyticsDateRange } from "../hooks/use-analytics-range";

const METRICS: { id: AnalyticsMetric; label: string }[] = [
  { id: "pv", label: "浏览量" },
  { id: "uv", label: "访客" },
  { id: "sessions", label: "会话" },
];

const SEGMENTS: { id: AnalyticsSegment; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "registered", label: "注册" },
  { id: "anonymous", label: "匿名" },
];

interface TrendTabProps {
  range: AnalyticsDateRange;
}

export function TrendTab({ range }: TrendTabProps) {
  const [metric, setMetric] = useState<AnalyticsMetric>("pv");
  const [segment, setSegment] = useState<AnalyticsSegment>("all");
  const fetcher = useCallback(
    () => apiClient.analytics.getTrend({ metric, segment, ...range }),
    [metric, range, segment],
  );
  const { data, loading } = useAnalyticsData<AnalyticsTrendPoint[]>(
    fetcher,
    [metric, segment, range.from, range.to],
    [],
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegToggle options={METRICS} value={metric} onChange={setMetric} />
        <SegToggle options={SEGMENTS} value={segment} onChange={setSegment} />
      </div>
      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted">
              加载中…
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted">
              暂无数据
            </div>
          ) : (
            <TrendChart data={data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
