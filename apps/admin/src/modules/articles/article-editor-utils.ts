import type { AdminArticleDetailResp, ArticleSaveReq } from "@repo/api";
import type { ArticleTag } from "./editor-options";

export type ArticleEditorStatusLabel = "草稿" | "已发布" | "加密";

export function formatMusicDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function statusToLabel(status: number): ArticleEditorStatusLabel {
  if (status === 1) return "已发布";
  if (status === 2) return "加密";
  return "草稿";
}

export function mapDetailToFormState(detail: AdminArticleDetailResp) {
  const categoryId =
    detail.category_ids?.[0] ?? detail.categories?.[0]?.id ?? detail.category?.id ?? null;

  const selectedTags: ArticleTag[] =
    detail.tags?.map((tag) => ({ id: tag.id, label: tag.name })) ?? [];

  const musicId = detail.music_ids?.[0] ?? detail.music?.[0]?.id ?? null;

  return {
    title: detail.title,
    description: detail.short_content ?? "",
    content: detail.content,
    coverUrl: detail.cover_img_url ?? "",
    categoryId,
    selectedTags,
    musicId,
    articleStatus: detail.status,
    commentStatus: detail.comment_status,
    isPassworded: detail.passworded === true || detail.status === 2,
    savedArticleId: detail.id,
  };
}

interface BuildSaveReqInput {
  title: string;
  description: string;
  content: string;
  coverUrl: string;
  categoryId: number | null;
  selectedTags: ArticleTag[];
  musicId: number | null;
  targetStatus: 0 | 1;
  commentStatus: 0 | 1;
  articleId?: number;
}

export function buildArticleSaveReq(input: BuildSaveReqInput): ArticleSaveReq {
  if (input.categoryId === null) {
    throw new Error("请选择文章分类");
  }

  return {
    ...(input.articleId !== undefined ? { id: input.articleId } : {}),
    title: input.title.trim(),
    cover_img_url: input.coverUrl.trim() || undefined,
    short_content: input.description.trim() || undefined,
    content: input.content,
    status: input.targetStatus,
    comment_status: input.commentStatus,
    category_ids: [input.categoryId],
    tags: input.selectedTags.map((tag, index) => ({ tag_id: tag.id, seq: index })),
    music_ids: input.musicId !== null ? [input.musicId] : [],
    recommend: false,
    recommend_seq: 0,
  };
}
