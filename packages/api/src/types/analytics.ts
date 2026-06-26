// 站点分析（后台）接口类型，对应后端 internal/dto/analytics。

/** 单一分档（注册/匿名）的今日计数。 */
export interface AnalyticsSegmentStat {
  today_pv: number;
  today_uv: number;
}

/** 后台总览：今日实时 + 在线 + 历史累计，含注册/匿名分档。 */
export interface AnalyticsOverviewResp {
  today_pv: number;
  today_uv: number;
  online: number;
  total_pv: number;
  total_uv: number;
  registered: AnalyticsSegmentStat;
  anonymous: AnalyticsSegmentStat;
}

export type AnalyticsMetric = "pv" | "uv" | "sessions";
export type AnalyticsSegment = "all" | "registered" | "anonymous";

export interface AnalyticsTrendReq {
  from?: string;
  to?: string;
  metric?: AnalyticsMetric;
  segment?: AnalyticsSegment;
}

/** 趋势图单点：某日某指标的取值。 */
export interface AnalyticsTrendPoint {
  date: string;
  value: number;
}

export type AnalyticsDimension = "referer_type" | "device" | "browser" | "os" | "country";

/**
 * 维度分布单项：按「天 × 维度取值」返回，故同一 dim_value 在区间内有多行。
 * 前端做饼/条时需按 dim_value 汇总 pv/uv。
 */
export interface AnalyticsDimensionPoint {
  date: string;
  dim_value: string;
  pv: number;
  uv: number;
}

/** 热门页面排行单项。 */
export interface AnalyticsPageStat {
  path: string;
  title: string;
  pv: number;
  uv: number;
}

/** 友链入站来源统计项，inbound_rate = 该友链 PV 占全站 PV 比例。 */
export interface AnalyticsFriendLinkStat {
  friend_link_id: number;
  friend_name: string;
  site: string;
  site_host: string;
  pv: number;
  uv: number;
  sessions: number;
  inbound_rate: number;
}

/** 实时概览：当前在线 + 最近活跃路径（仅聚合）。 */
export interface AnalyticsRealtimePath {
  path: string;
  active: number;
}
export interface AnalyticsRealtimeResp {
  online: number;
  recent_paths: AnalyticsRealtimePath[];
}

/** 聚合后的访问路径序列，不含 visitor/user/IP。 */
export interface AnalyticsPathSequence {
  sequence: string[];
  sessions: number;
}

/** 漏斗步骤的会话留存。 */
export interface AnalyticsFunnelStep {
  step: string;
  sessions: number;
  conversion_rate: number;
}

export interface AnalyticsRangeReq {
  from?: string;
  to?: string;
  limit?: number;
}

/** POST /admin/analytics/backfill 请求参数。 */
export interface AnalyticsBackfillReq {
  from: string;
  to: string;
}

/** 回填日聚合结果：成功重算的天数与区间。 */
export interface AnalyticsBackfillResp {
  from: string;
  to: string;
  days: number;
}

/** 后台首页汇总（非流量块）：内容总量、互动待办、用户统计。 */
export interface AdminOverviewSummaryResp {
  content: {
    articles: number;
    categories: number;
    tags: number;
    music: number;
    friend_links: number;
  };
  /** 近 7 天新增互动 */
  interactions: {
    new_comments: number;
    new_guestbook: number;
    new_moments: number;
  };
  users: {
    total: number;
    today_new: number;
    today_active: number;
  };
}
