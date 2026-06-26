import { useCallback, useState } from "react";
import { ApiError } from "@repo/api";
import type { AnalyticsFunnelStep } from "@repo/api";
import { Button, Card, CardContent } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";
import { useAnalyticsData } from "../hooks/use-analytics-data";

export function PathsTab() {
  const fetcher = useCallback(() => apiClient.analytics.getPaths({ limit: 20 }), []);
  const { data: paths, loading } = useAnalyticsData(fetcher, [], []);

  const [stepsText, setStepsText] = useState("/\n/articles");
  const [funnel, setFunnel] = useState<AnalyticsFunnelStep[]>([]);
  const [running, setRunning] = useState(false);

  const runFunnel = () => {
    const steps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length < 2) {
      addToast("漏斗至少需要两个步骤（每行一个路径）", "error");
      return;
    }
    setRunning(true);
    apiClient.analytics
      .getFunnel(steps)
      .then(setFunnel)
      .catch((err) => {
        if (err instanceof ApiError) addToast(err.message, "error");
      })
      .finally(() => setRunning(false));
  };

  const funnelTop = funnel[0]?.sessions ?? 0;

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 text-sm font-medium">热门访问路径</div>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted">加载中…</div>
          ) : paths.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">暂无路径数据</div>
          ) : (
            <div className="grid gap-2.5">
              {paths.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-text-primary">
                    {p.sequence.join(" → ")}
                  </span>
                  <span className="shrink-0 text-text-muted">{p.sessions} 会话</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 text-sm font-medium">自定义漏斗</div>
          <p className="mb-2 text-xs text-text-muted">
            每行一个路径，按顺序作为漏斗步骤（如 / 然后 /articles）。
          </p>
          <textarea
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-2 p-2 text-sm"
          />
          <div className="mt-2">
            <Button onPress={runFunnel} isDisabled={running}>
              {running ? "计算中…" : "计算漏斗"}
            </Button>
          </div>
          {funnel.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {funnel.map((step, idx) => (
                <div key={idx}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="truncate pr-3 text-text-primary">{step.step}</span>
                    <span className="shrink-0 text-text-muted">
                      {step.sessions} 会话 · {(step.conversion_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-0">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{
                        width: `${funnelTop > 0 ? Math.round((step.sessions / funnelTop) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
