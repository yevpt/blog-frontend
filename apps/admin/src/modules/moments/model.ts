import type { AdminMomentStatusFilter, MomentItemResp, MomentSaveReq } from "@repo/api";

export interface MomentImageRow {
  id: string;
  name: string;
  url: string;
  accessUrl: string;
}

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
  images: MomentImageRow[];
}

export interface MomentFormValues {
  content: string;
  status: "0" | "1";
  commentStatus: "0" | "1";
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
    images: item.images.map((image) => ({
      id: String(image.id),
      name: image.name,
      url: image.url,
      accessUrl: image.access_url,
    })),
  };
}

export function createEmptyMomentForm(): MomentFormValues {
  return { content: "", status: "1", commentStatus: "1" };
}

export function mapMomentToFormValues(moment: MomentRow): MomentFormValues {
  return {
    content: moment.content,
    status: String(moment.status) as "0" | "1",
    commentStatus: String(moment.commentStatus) as "0" | "1",
  };
}

export function validateMomentForm(values: MomentFormValues) {
  const errors: Partial<Record<keyof MomentFormValues, string>> = {};
  const content = values.content.trim();
  if (!content) errors.content = "请输入动态内容";
  if (content.length > 800) errors.content = "动态内容不能超过 800 个字符";
  return errors;
}

export function hasMomentFormErrors(errors: Partial<Record<keyof MomentFormValues, string>>) {
  return Object.keys(errors).length > 0;
}

export function toMomentSaveReq(
  values: MomentFormValues,
  editingMoment: MomentRow | null,
): MomentSaveReq {
  const image_urls = editingMoment?.images.map((image) => image.url) ?? [];
  return {
    id: editingMoment ? Number(editingMoment.id) : undefined,
    content: values.content.trim(),
    status: Number(values.status) as 0 | 1,
    comment_status: Number(values.commentStatus) as 0 | 1,
    image_urls,
    image_order: image_urls.map((_, index) => `url:${index}`),
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
