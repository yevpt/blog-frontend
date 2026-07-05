import type { LikedContentKind, UserLikedContentItemResp } from "@repo/api";
import type { LikedContentUiFilter } from "@/hooks/use-user-liked-content.shared";
import { mapUiFilterToApiType } from "@/hooks/use-user-liked-content.shared";

export type { LikedContentUiFilter };
export { mapUiFilterToApiType };

export const LIKED_CONTENT_FILTERS: ReadonlyArray<{
  value: LikedContentUiFilter;
  label: string;
}> = [
  { value: "all", label: "全部" },
  { value: "article", label: "文章" },
  { value: "comment", label: "评论" },
  { value: "guestbook", label: "留言" },
  { value: "moment", label: "碎语" },
];

export function getKindBadgeLabel(kind: LikedContentKind): string {
  switch (kind) {
    case "article":
      return "赞过文章";
    case "comment":
      return "赞过评论";
    case "reply":
      return "赞过回复";
    case "guestbook":
      return "赞过留言";
    case "moment":
      return "赞过碎语";
  }
}

export function getLikedContentAuthorName(author: UserLikedContentItemResp["author"]): string {
  if (!author) {
    return "匿名";
  }
  return author.nickname ?? author.username ?? "用户";
}

function buildCommentAnchor(contentId: number): string {
  return `#comment-${contentId}`;
}

export function getLikedContentRootHref(item: UserLikedContentItemResp): string | null {
  if (item.kind === "article") {
    if (item.content.deleted) {
      return null;
    }
    return `/articles/${item.content.id}`;
  }

  if (item.kind === "moment") {
    if (item.content.deleted) {
      return null;
    }
    return `/moments/${item.content.id}`;
  }

  if (item.kind === "guestbook") {
    if (item.content.deleted) {
      return null;
    }
    return "/guestbook";
  }

  const root = item.root;
  if (!root || root.deleted) {
    return null;
  }

  if (root.kind === "article") {
    return `/articles/${root.id}${buildCommentAnchor(item.content.id)}`;
  }
  if (root.kind === "moment") {
    return `/moments/${root.id}${buildCommentAnchor(item.content.id)}`;
  }
  return "/guestbook";
}

/** 文章 / 碎语 / 留言展示底部「打开…」入口；评论 / 回复用来源行跳转 */
export function shouldShowLikedContentActionLink(item: UserLikedContentItemResp): boolean {
  return item.kind === "article" || item.kind === "moment" || item.kind === "guestbook";
}

export function getLikedContentActionLabel(item: UserLikedContentItemResp): string {
  if (isLikedContentActionDisabled(item)) {
    return "原内容已不可访问";
  }

  switch (item.kind) {
    case "article":
      return "打开文章";
    case "moment":
      return "打开碎语";
    case "guestbook":
      return "打开留言板";
    default:
      return "查看";
  }
}

export function formatLikedContentRootContext(item: UserLikedContentItemResp): string | null {
  if (item.kind !== "comment" && item.kind !== "reply") {
    return null;
  }

  const root = item.root;
  if (!root) {
    return null;
  }
  if (root.deleted) {
    return "原内容已不可访问";
  }

  if (root.kind === "article") {
    const title = root.title ?? root.excerpt ?? "文章";
    return `来自文章：${title}`;
  }
  if (root.kind === "moment") {
    const excerpt = root.excerpt ?? root.title ?? "";
    return excerpt ? `来自碎语：${excerpt}` : "来自碎语";
  }
  return "来自留言板";
}

export function formatLikedContentParentLabel(item: UserLikedContentItemResp): string | null {
  if (item.kind !== "reply") {
    return null;
  }

  const parent = item.parent;
  if (!parent || parent.deleted) {
    return null;
  }

  return parent.kind === "guestbook" ? "回复自留言" : "回复自评论";
}

export function formatLikedContentParentExcerpt(item: UserLikedContentItemResp): string | null {
  if (item.kind !== "reply") {
    return null;
  }

  const parent = item.parent;
  if (!parent) {
    return null;
  }
  if (parent.deleted) {
    return "原内容已不可访问";
  }
  return parent.excerpt;
}

export function getLikedContentBodyText(item: UserLikedContentItemResp): string {
  if (item.content.deleted) {
    return "内容已删除";
  }
  return item.content.excerpt;
}

export interface LikedContentMentionTarget {
  name: string;
  userId?: number;
}

export interface LikedContentReplyBodyParts {
  mention: LikedContentMentionTarget | null;
  body: string;
}

const LEADING_MENTION_RE = /^@([\w\u4e00-\u9fff]+)\s*/;

function resolveReplyMentionTarget(
  item: UserLikedContentItemResp,
): LikedContentMentionTarget | null {
  const target = item.reply_to ?? item.to_user;
  if (!target) {
    return null;
  }
  const name = target.nickname ?? target.username;
  if (!name) {
    return null;
  }
  return { name, userId: target.id };
}

function stripLeadingMention(excerpt: string, mentionName?: string): string {
  const match = excerpt.match(LEADING_MENTION_RE);
  if (!match) {
    return excerpt;
  }
  if (mentionName && match[1].toLowerCase() !== mentionName.toLowerCase()) {
    return excerpt;
  }
  return excerpt.slice(match[0].length);
}

/** 回复正文：优先用 reply_to/to_user 补 @，再剥离 excerpt 里重复的 @ 前缀 */
export function getLikedContentReplyBodyParts(
  item: UserLikedContentItemResp,
): LikedContentReplyBodyParts {
  const raw = getLikedContentBodyText(item);
  const apiMention = item.kind === "reply" ? resolveReplyMentionTarget(item) : null;

  if (apiMention) {
    return {
      mention: apiMention,
      body: stripLeadingMention(raw, apiMention.name),
    };
  }

  const match = raw.match(LEADING_MENTION_RE);
  if (!match) {
    return { mention: null, body: raw };
  }

  return {
    mention: { name: match[1] },
    body: raw.slice(match[0].length),
  };
}

export function getLikedContentTitle(item: UserLikedContentItemResp): string | null {
  if (item.content.deleted || !item.content.title) {
    return null;
  }
  return item.content.title;
}

export function isLikedContentActionDisabled(item: UserLikedContentItemResp): boolean {
  return getLikedContentRootHref(item) === null;
}
