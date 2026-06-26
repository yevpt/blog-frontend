import { useEffect, useState } from "react";
import type { AnalyticsRealtimeResp } from "@repo/api";
import { Card, CardContent } from "@repo/ui";
import { apiClient } from "../../../lib/api";

const POLL_MS = 10000;

export function RealtimeTab() {
  const [data, setData] = useState<AnalyticsRealtimeResp>({ online: 0, recent_paths: [] });

  useEffect(() => {
    let alive = true;
    const load = () => {
      apiClient.analytics
        .getRealtime()
        .then((d) => {
          if (alive) setData(d);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            <span className="text-sm text-text-secondary">当前在线</span>
          </div>
          <div className="mt-1 text-4xl font-medium tracking-tight">
            {data.online.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-text-muted">每 10 秒自动刷新</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 text-sm font-medium">最近活跃页面</div>
          {data.recent_paths.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">最近无访问</div>
          ) : (
            <div className="grid gap-2.5">
              {data.recent_paths.map((p, idx) => (
                <div key={`${p.path}-${idx}`} className="flex justify-between text-sm">
                  <span className="truncate pr-3 text-text-primary">{p.path}</span>
                  <span className="shrink-0 text-text-muted">{p.active} 人</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
