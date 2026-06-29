import {
  ApiError,
  type AdminModerationItemResp,
  type AdminModerationListReq,
  type ModerationContentType,
  type ModerationPolicyAction,
  type ModerationPublicState,
  type ModerationReviewStatus,
  type ModerationRiskLevel,
} from "@repo/api";
import type { BadgeProps } from "@repo/ui";
import type { AdminListQueryCodec } from "../../lib/admin-list-query";
import {
  hasActiveListPage,
  hasActiveStringFilters,
  parseListPage,
  writeListPage,
  writeStringFilter,
} from "../../lib/admin-list-query";

/** 列表筛选值：`all` 表示不限定，对应后端 undefined */
export type FilterValue =
  | "all"
  | ModerationContentType
  | ModerationRiskLevel
  | ModerationReviewStatus
  | ModerationPublicState;

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

export interface AdminModerationListFilters {
  contentType: FilterValue;
  riskLevel: FilterValue;
  reviewStatus: FilterValue;
  publicState: FilterValue;
  [key: string]: string | undefined;
}

export interface ModerationListQueryState {
  page: number;
  filters: AdminModerationListFilters;
}

/** 表格行视图：把后端 itemResp 映射为列表/详情展示用的纯数据 */
export interface ModerationRow {
  itemId: number;
  authorId: number;
  lockVersion: number;
  revisionId: number;
  revisionVersion: number;
  lifecycleState: "active" | "deleted";
  publicState: ModerationPublicState;
  reviewStatus: ModerationReviewStatus;
  riskLevel: ModerationRiskLevel;
  policyAction: ModerationPolicyAction;
  contentTypeLabel: string;
  riskLabel: string;
  policyLabel: string;
  reviewLabel: string;
  publicStateLabel: string;
  summary: string;
  submittedContent: string;
  publishedContent: string;
  createdAt: string;
  momentOptions?: { status: 0 | 1; comment_status: 0 | 1 };
  decisionType?: "approved" | "corrected" | "rejected";
  decisionReason?: string;
  /** 紧急隐藏原因，仅紧急隐藏态有值。 */
  emergencyHideReason?: string;
  /** 紧急隐藏时间，仅紧急隐藏态有值。 */
  emergencyHiddenAt?: string;
  reviewerId?: number;
  reviewedAt?: string;
}

const DEFAULT_FILTERS: AdminModerationListFilters = {
  contentType: "all",
  riskLevel: "all",
  /** 文档要求：默认筛选 review_status=pending */
  reviewStatus: "pending",
  publicState: "all",
};

export const DEFAULT_MODERATION_LIST_QUERY_STATE: ModerationListQueryState = {
  page: 1,
  filters: DEFAULT_FILTERS,
};

const VALID_CONTENT_TYPES: ModerationContentType[] = [
  "moment",
  "article_comment",
  "moment_comment",
  "guestbook",
  "article_comment_reply",
  "moment_comment_reply",
  "guestbook_reply",
];

const VALID_RISK_LEVELS: ModerationRiskLevel[] = ["low", "medium", "high"];
const VALID_REVIEW_STATUSES: ModerationReviewStatus[] = [
  "pending",
  "approved",
  "rejected",
  "superseded",
];

const VALID_PUBLIC_STATES: ModerationPublicState[] = [
  "visible",
  "placeholder",
  "hidden",
  "emergency_hidden",
];

const ALL_OPTION: FilterOption<FilterValue> = { value: "all", label: "全部" };

export const CONTENT_TYPE_OPTIONS: FilterOption<FilterValue>[] = [
  ALL_OPTION,
  { value: "moment", label: "碎语" },
  { value: "article_comment", label: "文章评论" },
  { value: "moment_comment", label: "碎语评论" },
  { value: "guestbook", label: "留言" },
  { value: "article_comment_reply", label: "文章评论回复" },
  { value: "moment_comment_reply", label: "碎语评论回复" },
  { value: "guestbook_reply", label: "留言回复" },
];

export const RISK_LEVEL_OPTIONS: FilterOption<FilterValue>[] = [
  ALL_OPTION,
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
];

export const REVIEW_STATUS_OPTIONS: FilterOption<FilterValue>[] = [
  ALL_OPTION,
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已驳回" },
  { value: "superseded", label: "已过期" },
];

export const PUBLIC_STATE_OPTIONS: FilterOption<FilterValue>[] = [
  ALL_OPTION,
  { value: "visible", label: "公开" },
  { value: "placeholder", label: "占位" },
  { value: "hidden", label: "隐藏" },
  { value: "emergency_hidden", label: "紧急隐藏" },
];

const CONTENT_TYPE_LABEL: Record<ModerationContentType, string> = {
  moment: "碎语",
  article_comment: "文章评论",
  moment_comment: "碎语评论",
  guestbook: "留言",
  article_comment_reply: "文章评论回复",
  moment_comment_reply: "碎语评论回复",
  guestbook_reply: "留言回复",
};

const RISK_LEVEL_LABEL: Record<ModerationRiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

const REVIEW_STATUS_LABEL: Record<ModerationReviewStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  superseded: "已过期",
};

const PUBLIC_STATE_LABEL: Record<ModerationPublicState, string> = {
  visible: "公开",
  placeholder: "占位",
  hidden: "隐藏",
  emergency_hidden: "紧急隐藏",
};

const POLICY_ACTION_LABEL: Record<ModerationPolicyAction, string> = {
  auto_approve: "自动通过",
  post_review: "审后通过",
  pre_review: "先审后发",
  block: "阻断",
};

export function contentTypeLabel(type: ModerationContentType): string {
  return CONTENT_TYPE_LABEL[type];
}

export function riskLevelLabel(level: ModerationRiskLevel): string {
  return RISK_LEVEL_LABEL[level];
}

export function reviewStatusLabel(status: ModerationReviewStatus): string {
  return REVIEW_STATUS_LABEL[status];
}

export function publicStateLabel(state: ModerationPublicState): string {
  return PUBLIC_STATE_LABEL[state];
}

export function policyActionLabel(action: ModerationPolicyAction): string {
  return POLICY_ACTION_LABEL[action];
}

export function riskLevelVariant(level: ModerationRiskLevel): BadgeProps["variant"] {
  switch (level) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "error";
  }
}

export function reviewStatusVariant(status: ModerationReviewStatus): BadgeProps["variant"] {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "error";
    case "pending":
      return "warning";
    case "superseded":
      return "secondary";
  }
}

/** 紧急隐藏态用 error 徽章醒目提示；占位态用 secondary；其它用 outline。 */
export function publicStateVariant(state: ModerationPublicState): BadgeProps["variant"] {
  switch (state) {
    case "emergency_hidden":
      return "error";
    case "placeholder":
      return "secondary";
    case "hidden":
      return "outline";
    case "visible":
      return "success";
  }
}

/** 超长正文截断为列表摘要，避免单元格被长文本撑爆 */
export function truncateContent(text: string, max = 60): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function formatModerationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapItemToRow(item: AdminModerationItemResp): ModerationRow {
  return {
    itemId: item.item_id,
    authorId: item.author_id,
    lockVersion: item.lock_version,
    revisionId: item.revision_id,
    revisionVersion: item.revision_version,
    lifecycleState: item.lifecycle_state,
    publicState: item.public_state,
    reviewStatus: item.review_status,
    riskLevel: item.risk_level,
    policyAction: item.policy_action,
    contentTypeLabel: contentTypeLabel(item.subject.type),
    riskLabel: riskLevelLabel(item.risk_level),
    policyLabel: policyActionLabel(item.policy_action),
    reviewLabel: reviewStatusLabel(item.review_status),
    publicStateLabel: publicStateLabel(item.public_state),
    summary: truncateContent(item.submitted_content),
    submittedContent: item.submitted_content,
    publishedContent: item.published_content,
    createdAt: formatModerationDate(item.created_at),
    momentOptions: item.subject.type === "moment" ? item.moment_options : undefined,
    decisionType: item.decision_type,
    decisionReason: item.decision_reason,
    emergencyHideReason: item.emergency_hide_reason,
    emergencyHiddenAt: item.emergency_hidden_at
      ? formatModerationDate(item.emergency_hidden_at)
      : undefined,
    reviewerId: item.reviewer_id,
    reviewedAt: item.reviewed_at ? formatModerationDate(item.reviewed_at) : undefined,
  };
}

/** lifecycle_state=deleted 时禁用审核、隐藏与恢复 */
export function canReview(item: AdminModerationItemResp): boolean {
  return item.lifecycle_state !== "deleted" && item.review_status === "pending";
}

/** 已公开且未紧急隐藏的 item 可紧急隐藏 */
export function canHide(item: AdminModerationItemResp): boolean {
  return item.lifecycle_state !== "deleted" && item.public_state === "visible";
}

/** public_state=emergency_hidden 且未删除可恢复 */
export function canRestore(item: AdminModerationItemResp): boolean {
  return item.lifecycle_state !== "deleted" && item.public_state === "emergency_hidden";
}

/** 审核冲突错误码：服务端版本/状态已被其他审核员改动 */
export function isReviewConflictError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.code === "MODERATION_REVIEW_CONFLICT";
}

/** 把 FilterValue 转为后端可选过滤值：all → undefined */
function toApiFilter<T extends string>(value: FilterValue): T | undefined {
  return value === "all" ? undefined : (value as T);
}

/** 审核状态筛选：all 显式请求全部状态，其余原样传给后端。 */
function toReviewStatusApiFilter(
  value: FilterValue,
): AdminModerationListReq["review_status"] | undefined {
  if (value === "all") return "all";
  return toApiFilter<ModerationReviewStatus>(value);
}

/** 把列表查询状态转为后端 AdminModerationListReq */
export function toListReq(state: ModerationListQueryState): AdminModerationListReq {
  return {
    page: state.page,
    page_size: 10,
    content_type: toApiFilter(state.filters.contentType),
    risk_level: toApiFilter(state.filters.riskLevel),
    review_status: toReviewStatusApiFilter(state.filters.reviewStatus),
    public_state: toApiFilter(state.filters.publicState),
  };
}

export function hasActiveModerationListQuery(state: ModerationListQueryState): boolean {
  return (
    hasActiveListPage(state.page) ||
    hasActiveStringFilters(state.filters, {
      contentType: DEFAULT_FILTERS.contentType,
      riskLevel: DEFAULT_FILTERS.riskLevel,
      reviewStatus: DEFAULT_FILTERS.reviewStatus,
      publicState: DEFAULT_FILTERS.publicState,
    })
  );
}

function parseEnumFilter(
  params: URLSearchParams,
  key: string,
  valid: readonly string[],
  defaultValue: FilterValue,
): FilterValue {
  const raw = params.get(key);
  if (raw && (raw === "all" || valid.includes(raw))) return raw as FilterValue;
  return defaultValue;
}

export const moderationListQueryCodec: AdminListQueryCodec<ModerationListQueryState> = {
  defaultState: DEFAULT_MODERATION_LIST_QUERY_STATE,
  parse(params) {
    return {
      page: parseListPage(params),
      filters: {
        contentType: parseEnumFilter(
          params,
          "content_type",
          VALID_CONTENT_TYPES,
          DEFAULT_FILTERS.contentType,
        ),
        riskLevel: parseEnumFilter(
          params,
          "risk_level",
          VALID_RISK_LEVELS,
          DEFAULT_FILTERS.riskLevel,
        ),
        reviewStatus: parseEnumFilter(
          params,
          "review_status",
          VALID_REVIEW_STATUSES,
          DEFAULT_FILTERS.reviewStatus,
        ),
        publicState: parseEnumFilter(
          params,
          "public_state",
          VALID_PUBLIC_STATES,
          DEFAULT_FILTERS.publicState,
        ),
      },
    };
  },
  write(state) {
    const params = new URLSearchParams();
    writeListPage(params, state.page);
    writeStringFilter(
      params,
      "content_type",
      state.filters.contentType,
      DEFAULT_FILTERS.contentType,
    );
    writeStringFilter(params, "risk_level", state.filters.riskLevel, DEFAULT_FILTERS.riskLevel);
    writeStringFilter(
      params,
      "review_status",
      state.filters.reviewStatus,
      DEFAULT_FILTERS.reviewStatus,
    );
    writeStringFilter(
      params,
      "public_state",
      state.filters.publicState,
      DEFAULT_FILTERS.publicState,
    );
    return params;
  },
  hasActive: hasActiveModerationListQuery,
};
