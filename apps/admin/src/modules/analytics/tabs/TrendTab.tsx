import { useCallback, useState } from "react";
import type { AnalyticsMetric, AnalyticsSegment, AnalyticsTrendPoint } from "@repo/api";
import { AdminPanel } from "../../../components/AdminPanel";
import { AdminSegmentedControl } from "../../../components/AdminSegmentedControl";
import { apiClient } from "../../../lib/api";
import { TrendChart } from "../components/TrendChart";
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
    <AdminPanel
      title="流量趋势"
      description="按日期观察站点访问变化"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <AdminSegmentedControl
            ariaLabel="访问指标"
            options={METRICS}
            value={metric}
            onChange={setMetric}
          />
          <AdminSegmentedControl
            ariaLabel="访客类型"
            options={SEGMENTS}
            value={segment}
            onChange={setSegment}
          />
        </div>
      }
      contentClassName="px-3 pb-4 pt-5 sm:px-5 sm:pb-5"
    >
      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          加载中…
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <TrendChart data={data} />
      )}
    </AdminPanel>
  );
}
