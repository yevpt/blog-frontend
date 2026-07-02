import type { AdminModerationHistoryImageResp, ModerationContentType } from "@repo/api";

const UGC_CONTENT_TYPES = new Set<ModerationContentType>([
  "article_comment",
  "moment_comment",
  "guestbook",
  "article_comment_reply",
  "moment_comment_reply",
  "guestbook_reply",
]);

/** 留言/评论类 UGC 与 web ThreadCommentContent 一致，需 nofollow ugc 链接策略。 */
export function isUgcModerationContentType(type: ModerationContentType): boolean {
  return UGC_CONTENT_TYPES.has(type);
}

/** 碎语正文与图片分离存储，详情区单独展示图片网格。 */
export function isMomentModerationContentType(type: ModerationContentType): boolean {
  return type === "moment";
}

/** 镜像 web 端与后端 binding 的正文字数上限。 */
export const UGC_CONTENT_MAX_LENGTH = 2000;
export const MOMENT_CONTENT_MAX_LENGTH = 800;
export const MODERATION_CHARACTER_COUNT_THRESHOLD = 100;

export function moderationContentMaxLength(type: ModerationContentType): number {
  return isMomentModerationContentType(type) ? MOMENT_CONTENT_MAX_LENGTH : UGC_CONTENT_MAX_LENGTH;
}

/**
 * 将正文中的 object_key 替换为后端返回的 access_url，供 Markdown 渲染真实图片。
 * 仅使用 history 接口提供的 access_url，不做任何地址猜测。
 */
export function resolveModerationImageRefs(
  content: string,
  images: AdminModerationHistoryImageResp[] | undefined,
): string {
  if (!content || !images?.length) return content;

  let resolved = content;
  for (const image of images) {
    if (!image.object_key || !image.access_url) continue;
    resolved = resolved.split(image.object_key).join(image.access_url);
  }
  return resolved;
}

/** 按 revision_id 从历史分页结果中取出图片快照。 */
export function findRevisionImages(
  revisions: Array<{ revision_id: number; images?: AdminModerationHistoryImageResp[] }>,
  revisionId: number,
): AdminModerationHistoryImageResp[] {
  return revisions.find((revision) => revision.revision_id === revisionId)?.images ?? [];
}
