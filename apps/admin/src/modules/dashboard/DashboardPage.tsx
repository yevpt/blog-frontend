import { useCallback, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AdminOverviewSummaryResp, AnalyticsOverviewResp } from "@repo/api";
import { SvgIcon, type IconName } from "@repo/icons";
import { Card, cn } from "@repo/ui";
import { apiClient } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { useAnalyticsData } from "../analytics/hooks/use-analytics-data";
import { useAnalyticsRange } from "../analytics/hooks/use-analytics-range";
import { AnalyticsRangeControl } from "../analytics/components/AnalyticsRangeControl";
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

const CONTENT_OVERVIEW_LINKS = [
  { label: "文章", key: "articles", to: "/articles", icon: "pen" },
  { label: "分类", key: "categories", to: "/categories", icon: "folder" },
  { label: "标签", key: "tags", to: "/tags", icon: "tag" },
  { label: "音乐", key: "music", to: "/music", icon: "music" },
  { label: "友链", key: "friend_links", to: "/links", icon: "link" },
  { label: "用户", key: "users", to: "/users", icon: "user" },
] as const;

interface StatCardProps {
  icon: IconName;
  label: string;
  value: string;
  hint?: ReactNode;
  /** 图标容器色调，默认品牌紫柔底 */
  tone?: "primary" | "success";
}

function StatCard({ icon, label, value, hint, tone = "primary" }: StatCardProps) {
  return (
    <Card interactive className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-[28px] font-semibold leading-9 tracking-tight tabular-nums">
            {value}
          </div>
          {hint ? <div className="mt-2 flex items-center gap-1.5">{hint}</div> : null}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            tone === "success" ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
          )}
        >
          <SvgIcon name={icon} size={20} />
        </span>
      </div>
    </Card>
  );
}

/** 卡片区块标题：柔紫图标 + 标题，统一各数据卡片的视觉锚点。 */
function SectionHeader({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-md bg-primary-soft text-primary"
      >
        <SvgIcon name={icon} size={15} />
      </span>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

/** 涨跌幅徽标：绿涨红跌，箭头图标随方向旋转。 */
function DeltaBadge({ delta }: { delta: number }) {
  const isUp = delta >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        isUp ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      <SvgIcon name="arrow-up" size={12} className={cn(!isUp && "rotate-180")} />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

function getContentOverviewValue(
  summary: AdminOverviewSummaryResp,
  key: (typeof CONTENT_OVERVIEW_LINKS)[number]["key"],
) {
  if (key === "users") return summary.users.total;
  return summary.content[key];
}

export function DashboardPage() {
  const displayName =
    useAuthStore((state) => state.user?.nickname || state.user?.username) ?? "管理员";
  const range = useAnalyticsRange();

  const { data: overview } = useAnalyticsData(
    useCallback(() => apiClient.analytics.getOverview(), []),
    [],
    EMPTY_OVERVIEW,
  );
  const { data: trend } = useAnalyticsData(
    useCallback(
      () => apiClient.analytics.getTrend({ metric: "pv", ...range.query }),
      [range.query],
    ),
    [range.query.from, range.query.to],
    [],
  );
  const { data: dims } = useAnalyticsData(
    useCallback(
      () => apiClient.analytics.getDimensions("referer_type", range.query),
      [range.query],
    ),
    [range.query.from, range.query.to],
    [],
  );
  const { data: pages } = useAnalyticsData(
    useCallback(() => apiClient.analytics.getPages({ limit: 5, ...range.query }), [range.query]),
    [range.query.from, range.query.to],
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
          <h1 className="text-2xl font-semibold tracking-tight">你好，{displayName}</h1>
          <div className="mt-0.5 text-sm text-muted-foreground">趋势与排行范围：{range.label}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <AnalyticsRangeControl range={range} />
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground/80 shadow-card">
            {/* 在线脉冲点：ping 动画外圈 + 实心芯 */}
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="tabular-nums">{overview.online}</span> 人在线
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon="eye"
          label="今日访问"
          value={overview.today_pv.toLocaleString()}
          hint={
            delta === null ? undefined : (
              <>
                <DeltaBadge delta={delta} />
                <span className="text-xs text-muted-foreground">较昨日</span>
              </>
            )
          }
        />
        <StatCard
          icon="user"
          label="独立访客"
          value={overview.today_uv.toLocaleString()}
          hint={
            <span className="text-xs text-muted-foreground">
              注册 {overview.registered.today_uv} · 匿名 {overview.anonymous.today_uv}
            </span>
          }
        />
        <StatCard
          icon="monitor"
          label="当前在线"
          value={overview.online.toLocaleString()}
          tone="success"
          hint={
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-success" />
              实时
            </span>
          }
        />
        <StatCard
          icon="calendar"
          label="累计访问"
          value={overview.total_pv.toLocaleString()}
          hint={
            <span className="text-xs text-muted-foreground tabular-nums">
              UV {overview.total_uv.toLocaleString()}
            </span>
          }
        />
      </div>

      <Card>
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <SectionHeader icon="arrow-up-right" title="访问趋势" />
        </div>
        <div className="px-3 pb-4 sm:px-4">
          {trend.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <TrendChart data={trend} />
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionHeader icon="link" title="访问来源" />
          <BarList items={sources} />
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionHeader icon="eye" title="热门页面" />
          {pages.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">暂无数据</div>
          ) : (
            <ol className="grid gap-2.5 text-sm">
              {pages.map((page, idx) => (
                <li key={`${page.path}-${idx}`} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold tabular-nums",
                      idx < 3 ? "bg-primary-soft text-primary" : "text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="min-w-0 truncate text-foreground">
                    {page.title || page.path}
                  </span>
                  <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                    {page.pv.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <SectionHeader icon="home" title="站点概况" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CONTENT_OVERVIEW_LINKS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              aria-label={`查看${item.label}管理`}
              className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <SvgIcon
                  name={item.icon}
                  size={14}
                  className="transition-colors group-hover:text-primary"
                />
                <span className="text-xs">{item.label}</span>
              </div>
              <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums transition-colors group-hover:text-primary">
                {getContentOverviewValue(summary, item.key).toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">近 7 天</span>
          <Link
            to="/comments"
            aria-label="查看评论管理"
            className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            新增评论{" "}
            <span className="font-medium tabular-nums">{summary.interactions.new_comments}</span>
          </Link>
          <Link
            to="/guestbook"
            aria-label="查看留言管理"
            className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            新留言{" "}
            <span className="font-medium tabular-nums">{summary.interactions.new_guestbook}</span>
          </Link>
          <Link
            to="/moments"
            aria-label="查看碎语管理"
            className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            新碎语{" "}
            <span className="font-medium tabular-nums">{summary.interactions.new_moments}</span>
          </Link>
          <Link
            to="/users"
            aria-label="查看用户管理"
            className="ml-auto rounded-sm text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            今日新增用户{" "}
            <span className="font-medium text-success tabular-nums">
              +{summary.users.today_new}
            </span>{" "}
            · 活跃 <span className="tabular-nums">{summary.users.today_active}</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
