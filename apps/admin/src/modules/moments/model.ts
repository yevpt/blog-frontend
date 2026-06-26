import type { AdminMomentStatusFilter, MomentItemResp } from "@repo/api";

export interface MomentRow {
  id: string;
  authorName: string;
  content: string;
  status: 0 | 1;
  statusLabel: string;
  commentStatus: 0 | 1;
  isTop: boolean;
  imageCount: number;
  readCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export const MOMENT_STATUS_FILTER_OPTIONS: Array<{
  value: AdminMomentStatusFilter;
  label: string;
}> = [
  { value: "all", label: "全部动态" },
  { value: "public", label: "公开" },
  { value: "hidden", label: "隐藏" },
];

export function mapMomentToRow(item: MomentItemResp): MomentRow {
  return {
    id: String(item.id),
    authorName: item.user?.nickname ?? item.user?.username ?? `用户 #${item.user_id}`,
    content: item.content,
    status: item.status,
    statusLabel: item.status === 1 ? "公开" : "隐藏",
    commentStatus: item.comment_status,
    isTop: item.is_top,
    imageCount: item.images.length,
    readCount: item.read_count,
    likeCount: item.like_count,
    commentCount: item.comment_count,
    createdAt: formatAdminDateTime(item.created_at),
  };
}

function formatAdminDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
