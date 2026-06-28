import type { AdminArticleDetailResp, ArticleSaveReq, MusicItemResp } from "@repo/api";
import type { ArticleTag } from "./editor-options";

export type ArticleEditorStatusLabel = "隐藏" | "已发布" | "加密" | "草稿";

export interface ArticleEditorMusicOption {
  id: number;
  label: string;
  artist: string;
  duration: string;
  durationSeconds: number;
  url?: string;
}

export function formatMusicDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function statusToLabel(status: number): ArticleEditorStatusLabel {
  if (status === 0) return "隐藏";
  if (status === 1) return "已发布";
  if (status === 2) return "加密";
  return "草稿";
}

/** 解析曲目歌手展示名，与前台 article-music 口径一致 */
export function resolveMusicArtistLabel(item: MusicItemResp): string {
  const display = item.artist_display_name?.trim();
  if (display) return display;

  const fromArtists = item.artists
    ?.map((artist) => artist.display_name?.trim() || artist.name.trim())
    .filter(Boolean)
    .join(" / ");
  if (fromArtists) return fromArtists;

  return item.singer?.trim() ?? "";
}

export function mapMusicItemToEditorOption(item: MusicItemResp): ArticleEditorMusicOption {
  return {
    id: item.id,
    label: item.name,
    artist: resolveMusicArtistLabel(item),
    duration: formatMusicDuration(item.duration),
    durationSeconds: item.duration,
    url: item.audio_url ?? item.url,
  };
}

export function mapMusicListToEditorOptions(items: MusicItemResp[]): ArticleEditorMusicOption[] {
  return items.map(mapMusicItemToEditorOption);
}

/** 优先从公开曲库匹配，否则用详情里的 music 兜底（如非公开曲目） */
export function resolveEditorMusicOption(
  musicId: number | null,
  musicList: MusicItemResp[],
  detailMusic?: MusicItemResp[],
): ArticleEditorMusicOption | null {
  if (musicId === null) return null;

  const fromList = musicList.find((item) => item.id === musicId);
  if (fromList) return mapMusicItemToEditorOption(fromList);

  const fromDetail = detailMusic?.find((item) => item.id === musicId);
  if (fromDetail) return mapMusicItemToEditorOption(fromDetail);

  return null;
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
    mobileCoverUrl: detail.mobile_cover_img_url ?? "",
    categoryId,
    selectedTags,
    musicId,
    articleStatus: detail.status,
    commentStatus: detail.comment_status,
    isRecommended: detail.is_recommended === true,
    isPassworded: detail.passworded === true || detail.status === 2,
    savedArticleId: detail.id,
  };
}

interface BuildSaveReqInput {
  title: string;
  description: string;
  content: string;
  coverUrl: string;
  mobileCoverUrl: string;
  categoryId: number | null;
  selectedTags: ArticleTag[];
  musicId: number | null;
  targetStatus: 0 | 1 | 2 | 3;
  commentStatus: 0 | 1;
  isRecommended: boolean;
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
    mobile_cover_img_url: input.mobileCoverUrl.trim() || undefined,
    short_content: input.description.trim() || undefined,
    content: input.content,
    status: input.targetStatus,
    comment_status: input.commentStatus,
    category_ids: [input.categoryId],
    tags: input.selectedTags.map((tag, index) => ({ tag_id: tag.id, seq: index })),
    music_ids: input.musicId !== null ? [input.musicId] : [],
    recommend: input.isRecommended,
  };
}
