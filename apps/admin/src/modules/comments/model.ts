import type { AdminCommentTargetType, CommentItemResp } from "@repo/api";
import type { AdminListQueryCodec } from "../../lib/admin-list-query";
import {
  hasActiveListPage,
  hasActiveListSearch,
  hasActiveStringFilters,
  parseListPage,
  parseListSearch,
  parseStringFilter,
  writeListPage,
  writeListSearch,
  writeStringFilter,
} from "../../lib/admin-list-query";

export type CommentTargetType = Exclude<AdminCommentTargetType, "all">;

export interface AdminCommentListFilters {
  [key: string]: string | undefined;
  targetType: AdminCommentTargetType;
  search: string;
}

export interface AdminCommentListQueryState {
  page: number;
  filters: AdminCommentListFilters;
}

const DEFAULT_COMMENT_LIST_FILTERS: AdminCommentListFilters = {
  targetType: "all",
  search: "",
};

export const DEFAULT_COMMENT_LIST_QUERY_STATE: AdminCommentListQueryState = {
  page: 1,
  filters: DEFAULT_COMMENT_LIST_FILTERS,
};

export const commentListQueryCodec: AdminListQueryCodec<AdminCommentListQueryState> = {
  defaultState: DEFAULT_COMMENT_LIST_QUERY_STATE,
  parse(params) {
    return {
      page: parseListPage(params),
      filters: {
        targetType: parseStringFilter(
          params,
          "target",
          DEFAULT_COMMENT_LIST_FILTERS.targetType,
        ) as AdminCommentTargetType,
        search: parseListSearch(params, DEFAULT_COMMENT_LIST_FILTERS.search),
      },
    };
  },
  write(state) {
    const params = new URLSearchParams();
    writeListPage(params, state.page);
    writeListSearch(params, state.filters.search);
    writeStringFilter(
      params,
      "target",
      state.filters.targetType,
      DEFAULT_COMMENT_LIST_FILTERS.targetType,
    );
    return params;
  },
  hasActive(state) {
    return (
      hasActiveListPage(state.page) ||
      hasActiveListSearch(state.filters.search) ||
      hasActiveStringFilters(state.filters, {
        targetType: DEFAULT_COMMENT_LIST_FILTERS.targetType,
      })
    );
  },
};

export interface CommentRow {
  id: string;
  targetType: CommentTargetType;
  targetLabel: string;
  targetId: number;
  authorName: string;
  content: string;
  replyCount: number;
  likeCount: number;
  createdAt: string;
}

export const COMMENT_TARGET_FILTER_OPTIONS: Array<{
  value: AdminCommentTargetType;
  label: string;
}> = [
  { value: "all", label: "全部评论" },
  { value: "article", label: "文章" },
  { value: "moment", label: "碎语" },
];

export function commentTargetLabel(targetType: CommentTargetType) {
  return targetType === "article" ? "文章" : "碎语";
}

export function mapCommentToRow(item: CommentItemResp): CommentRow {
  const targetType = item.target_type === "moment" ? "moment" : "article";
  return {
    id: String(item.id),
    targetType,
    targetLabel: commentTargetLabel(targetType),
    targetId: item.target_id,
    authorName: item.user?.nickname ?? item.user?.username ?? `用户 #${item.user_id}`,
    content: item.content,
    replyCount: item.reply_count,
    likeCount: item.like_count,
    createdAt: formatAdminDateTime(item.created_at),
  };
}

function formatAdminDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date
    .toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "/");
}
