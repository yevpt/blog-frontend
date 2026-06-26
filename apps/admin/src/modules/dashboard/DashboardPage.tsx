import { useCallback, useMemo } from "react";
import type { AdminOverviewSummaryResp, AnalyticsOverviewResp } from "@repo/api";
import { Card, CardContent } from "@repo/ui";
import { apiClient } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { useAnalyticsData } from "../analytics/hooks/use-analytics-data";
import { TrendChart } from "../analytics/components/TrendChart";
import { BarList, type BarListItem } from "../analytics/components/BarList";

const EMPTY_OVERVIEW: AnalyticsOverviewResp = {
  today_pv: 0,
  today_uv: 0,
  online: 0,
  total_pv: 0,
  total_uv: 0,
  registered: { today_pv: 0, today_uv: 0 },
  anonymous: { today_pv: 0, today_uv: 0 },
};

const EMPTY_SUMMARY: AdminOverviewSummaryResp = {
  content: { articles: 0, categories: 0, tags: 0, music: 0, friend_links: 0 },
  interactions: { new_comments: 0, new_guestbook: 0, new_moments: 0 },
  users: { total: 0, today_new: 0, today_active: 0 },
};

const REFERER_LABELS: Record<string, string> = {
  direct: "直接访问",
  search: "搜索引擎",
  social: "社交媒体",
  external: "外部链接",
  internal: "站内跳转",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex-1 px-5 py-4 first:pl-0 sm:border-l sm:border-border sm:first:border-l-0">
      <div className="text-sm text-text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-medium tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
    </div>
  );
}

export function DashboardPage() {
  const displayName =
    useAuthStore((state) => state.user?.nickname || state.user?.username) ?? "管理员";

  const { data: overview } = useAnalyticsData(
    useCallback(() => apiClient.analytics.getOverview(), []),
    [],
    EMPTY_OVERVIEW,
  );
  const { data: trend } = useAnalyticsData(
    useCallback(() => apiClient.analytics.getTrend({ metric: "pv" }), []),
    [],
    [],
  );
  const { data: dims } = useAnalyticsData(
    useCallback(() => apiClient.analytics.getDimensions("referer_type"), []),
    [],
    [],
  );
  const { data: pages } = useAnalyticsData(
    useCallback(() => apiClient.analytics.getPages({ limit: 5 }), []),
    [],
    [],
  );
  const { data: summary } = useAnalyticsData(
    useCallback(() => apiClient.analytics.getOverviewSummary(), []),
    [],
    EMPTY_SUMMARY,
  );

  const delta = useMemo(() => {
    if (trend.length < 2) return null;
    const today = trend[trend.length - 1]!.value;
    const prev = trend[trend.length - 2]!.value;
    if (prev === 0) return null;
    return ((today - prev) / prev) * 100;
  }, [trend]);

  const sources: BarListItem[] = useMemo(() => {
    const agg = new Map<string, number>();
    for (const row of dims) agg.set(row.dim_value, (agg.get(row.dim_value) ?? 0) + row.pv);
    return [...agg.entries()]
      .map(([key, value]) => ({ label: REFERER_LABELS[key] ?? key, value }))
      .sort((a, b) => b.value - a.value);
  }, [dims]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">你好，{displayName}</h1>
          <div className="text-sm text-text-muted">这是你站点今天的表现</div>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <span className="inline-block h-2 w-2 rounded-full bg-success" />
          {overview.online} 人在线
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col p-0 sm:flex-row">
          <Stat
            label="今日访问"
            value={overview.today_pv.toLocaleString()}
            hint={
              delta === null
                ? undefined
                : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)}% 较昨日`
            }
          />
          <Stat
            label="独立访客"
            value={overview.today_uv.toLocaleString()}
            hint={`注册 ${overview.registered.today_uv} · 匿名 ${overview.anonymous.today_uv}`}
          />
          <Stat label="当前在线" value={overview.online.toLocaleString()} hint="实时" />
          <Stat
            label="累计访问"
            value={overview.total_pv.toLocaleString()}
            hint={`UV ${overview.total_uv.toLocaleString()}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-2 text-sm font-medium">访问趋势</div>
          {trend.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted">
              暂无数据
            </div>
          ) : (
            <TrendChart data={trend} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 text-sm font-medium">访问来源</div>
            <BarList items={sources} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 text-sm font-medium">热门页面</div>
            {pages.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">暂无数据</div>
            ) : (
              <div className="grid gap-2.5 text-sm">
                {pages.map((page, idx) => (
                  <div key={`${page.path}-${idx}`} className="flex justify-between gap-3">
                    <span className="truncate text-text-primary">{page.title || page.path}</span>
                    <span className="shrink-0 text-text-muted">{page.pv.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 text-sm font-medium">站点概况</div>
          <div className="flex flex-wrap gap-y-4">
            {[
              { label: "文章", value: summary.content.articles },
              { label: "分类", value: summary.content.categories },
              { label: "标签", value: summary.content.tags },
              { label: "音乐", value: summary.content.music },
              { label: "友链", value: summary.content.friend_links },
              { label: "用户", value: summary.users.total },
            ].map((item) => (
              <div key={item.label} className="min-w-[80px] flex-1">
                <div className="text-lg font-medium">{item.value.toLocaleString()}</div>
                <div className="mt-0.5 text-xs text-text-muted">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
            <span className="text-text-muted">近 7 天</span>
            <span>
              新增评论 <span className="font-medium">{summary.interactions.new_comments}</span>
            </span>
            <span>
              新留言 <span className="font-medium">{summary.interactions.new_guestbook}</span>
            </span>
            <span>
              新动态 <span className="font-medium">{summary.interactions.new_moments}</span>
            </span>
            <span className="ml-auto text-text-secondary">
              今日新增用户{" "}
              <span className="font-medium text-success">+{summary.users.today_new}</span> · 活跃{" "}
              {summary.users.today_active}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
