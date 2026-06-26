import { useEffect, useState } from "react";
import { ApiError } from "@repo/api";
import type { AnalyticsMetric, AnalyticsSegment, AnalyticsTrendPoint } from "@repo/api";
import { Card, CardContent } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";
import { TrendChart } from "../components/TrendChart";
import { SegToggle } from "../components/SegToggle";

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

export function TrendTab() {
  const [metric, setMetric] = useState<AnalyticsMetric>("pv");
  const [segment, setSegment] = useState<AnalyticsSegment>("all");
  const [data, setData] = useState<AnalyticsTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiClient.analytics
      .getTrend({ metric, segment })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((err) => {
        if (err instanceof ApiError) addToast(err.message, "error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [metric, segment]);

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
