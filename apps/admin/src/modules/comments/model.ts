import type { AdminCommentTargetType, CommentItemResp } from "@repo/api";

export type CommentTargetType = Exclude<AdminCommentTargetType, "all">;

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
  { value: "moment", label: "动态" },
];

export function commentTargetLabel(targetType: CommentTargetType) {
  return targetType === "article" ? "文章" : "动态";
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
