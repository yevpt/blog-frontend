import type { NotificationItemResp } from "@repo/api";
import { htmlExcerptToPlainText } from "@repo/markdown";

export interface NotificationQuote {
  title?: string;
  text: string;
}

export interface NotificationInlineActions {
  canLike: boolean;
  canReply: boolean;
}

/** 卡片内联回复 API 目标；无法安全推断时返回 null。 */
export interface NotificationReplyTarget {
  url: string;
  parent_reply_id: number;
}

interface NotificationSnapshot {
  type?: string;
  id?: number;
  title?: string;
  excerpt?: string;
}

interface NotificationMetadata {
  comment_id?: number | string;
  source_snapshot?: NotificationSnapshot;
  root_snapshot?: NotificationSnapshot;
  quote_snapshot?: NotificationSnapshot;
  moderation?: ModerationMetadata;
}

interface ModerationMetadata {
  item_id?: number;
  revision_id?: number;
  decision?: string;
}

export type ModerationNotificationDecision = "approved" | "corrected" | "rejected";

const MODERATION_DECISIONS = new Set<ModerationNotificationDecision>([
  "approved",
  "corrected",
  "rejected",
]);

const INLINE_ACTION_TYPES = new Set(["comment_created", "reply_created", "guestbook_created"]);

const BODY_TEXT_TYPES = new Set([
  "comment_created",
  "reply_created",
  "guestbook_created",
  "comment_liked",
  "reply_liked",
  "guestbook_liked",
]);

/** 操作人展示名；无操作人时回退为系统通知。 */
export function getNotificationActorName(item: NotificationItemResp): string {
  const nickname = item.actor_user?.nickname?.trim();
  if (nickname) return nickname;
  return item.type === "system_notice" ? "系统通知" : "用户";
}

/** 操作人用户 ID；系统通知不跳转个人页。 */
export function getNotificationActorUserId(item: NotificationItemResp): number | null {
  if (item.type === "system_notice") return null;
  return item.actor_user?.id ?? item.actor_user_id ?? null;
}

/** 操作人个人页路径；无有效 ID 时返回 null。 */
export function getNotificationActorProfileHref(item: NotificationItemResp): string | null {
  const userId = getNotificationActorUserId(item);
  return userId != null ? `/users/${userId}` : null;
}

/** 按事件类型生成动作文案（不含操作人昵称）。 */
export function getNotificationActionText(item: NotificationItemResp): string {
  const moderationDecision = getModerationNotificationDecision(item);
  if (moderationDecision === "approved") return "你的内容已通过审核";
  if (moderationDecision === "corrected") return "你的内容经管理员修正后已发布";
  if (moderationDecision === "rejected") return "你的内容审核未通过";

  switch (item.type) {
    case "article_liked":
      return "赞了你的文章";
    case "moment_liked":
      return "赞了你的碎语";
    case "comment_liked":
      if (item.root_type === "moment") return "赞了你给碎语发表的评论";
      return "赞了你的评论";
    case "reply_liked":
      return "赞了你的回复";
    case "guestbook_liked":
      return "赞了你的留言";
    case "guestbook_created":
      return "发表了留言";
    case "system_notice":
      return "发布了系统通知";
    case "comment_created":
      if (item.root_type === "article") return "评论了你的文章";
      if (item.root_type === "moment") return "评论了你的碎语";
      if (item.root_type === "guestbook") return "发表了留言";
      break;
    case "reply_created":
      if (item.root_type === "article") return "回复了文章下你的评论";
      if (item.root_type === "moment") return "回复了碎语下你的评论";
      if (item.root_type === "guestbook") return "回复了留言下你的评论";
      break;
    case "legacy_notice":
      return item.title || "你有一条新消息";
    default:
      return item.title || "你有一条新消息";
  }
  return item.title || "你有一条新消息";
}

function parseNotificationMetadata(metadata?: string): NotificationMetadata {
  if (!metadata) return {};
  try {
    const parsed: unknown = JSON.parse(metadata);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as NotificationMetadata;
  } catch {
    return {};
  }
}

function isModerationDecision(value: unknown): value is ModerationNotificationDecision {
  return (
    typeof value === "string" && MODERATION_DECISIONS.has(value as ModerationNotificationDecision)
  );
}

/** 解析审核通知 decision；仅 system_notice 且 decision 合法时返回，否则 null。 */
export function getModerationNotificationDecision(
  item: NotificationItemResp,
): ModerationNotificationDecision | null {
  if (item.type !== "system_notice") return null;
  const decision = parseNotificationMetadata(item.metadata).moderation?.decision;
  return isModerationDecision(decision) ? decision : null;
}

/** 审核修正/驳回理由；approved 或无 excerpt 时返回 null。 */
export function getModerationNotificationReasonText(item: NotificationItemResp): string | null {
  const decision = getModerationNotificationDecision(item);
  if (decision !== "corrected" && decision !== "rejected") return null;
  const excerpt = item.content_excerpt?.trim();
  return excerpt || null;
}

function snapshotText(snapshot?: NotificationSnapshot): string {
  const raw = snapshot?.excerpt?.trim() ?? "";
  if (!raw) return "";
  return htmlExcerptToPlainText(raw);
}

function snapshotTitle(snapshot?: NotificationSnapshot): string {
  return snapshot?.title?.trim() ?? "";
}

function deletedText(objectType: string): string {
  switch (objectType) {
    case "article":
      return "文章已删除";
    case "moment":
      return "碎语已删除";
    case "guestbook":
      return "留言已删除";
    case "comment":
      return "评论已删除";
    case "reply":
      return "回复已删除";
    default:
      return "内容已删除";
  }
}

function commentQuoteTitle(
  item: NotificationItemResp,
  rootSnapshot?: NotificationSnapshot,
): string | undefined {
  if (item.root_type === "article") {
    const title = snapshotTitle(rootSnapshot);
    if (title) return `《${title}》`;
    if (rootSnapshot?.type === "article" || !rootSnapshot?.type) return "文章";
  }
  return undefined;
}

/** 从 metadata JSON 解析父评论 ID（reply 点赞等场景）。 */
export function extractCommentIdFromMetadata(metadata?: string): number | null {
  const raw = parseNotificationMetadata(metadata).comment_id;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** 评论类引用正文：回复优先 quote_snapshot，其余展示 root_snapshot。 */
function getCommentQuoteText(
  item: NotificationItemResp,
  body: string | null,
  metadata: NotificationMetadata,
): string {
  if (item.root_deleted) return deletedText(item.root_type);

  if (item.type === "reply_created" || item.type === "reply_liked") {
    const quoteText = snapshotText(metadata.quote_snapshot);
    if (quoteText && quoteText !== body) return quoteText;
  }
  const rootText = snapshotText(metadata.root_snapshot);
  if (rootText && rootText !== body) return rootText;
  return "";
}

function nonEmptyQuote(title?: string, text?: string): NotificationQuote | null {
  const trimmedTitle = title?.trim();
  const trimmedText = text?.trim() ?? "";
  if (!trimmedTitle && !trimmedText) return null;
  return { title: trimmedTitle, text: trimmedText };
}

/** 发表留言类事件：正文已展示留言内容，无需再附「留言板」引用块。 */
function isGuestbookPostNotification(item: NotificationItemResp): boolean {
  return (
    item.type === "guestbook_created" ||
    (item.type === "comment_created" && item.root_type === "guestbook")
  );
}

/** 轻量引用块：点赞类展示对象标题/摘录；评论类展示根对象上下文。 */
export function getNotificationQuote(item: NotificationItemResp): NotificationQuote | null {
  const metadata = parseNotificationMetadata(item.metadata);
  const rootSnapshot = metadata.root_snapshot;
  if (item.type === "article_liked") {
    const title = snapshotTitle(rootSnapshot);
    const text =
      item.root_deleted || item.source_deleted
        ? deletedText("article")
        : snapshotText(rootSnapshot) || htmlExcerptToPlainText(item.content_excerpt?.trim() ?? "");
    return nonEmptyQuote(title, text);
  }
  if (item.type === "moment_liked") {
    // 碎语无独立标题，引用块只展示正文摘录
    const excerptText = item.content_excerpt?.trim()
      ? htmlExcerptToPlainText(item.content_excerpt.trim())
      : "";
    const text =
      item.root_deleted || item.source_deleted
        ? deletedText("moment")
        : excerptText || snapshotText(rootSnapshot);
    return nonEmptyQuote(undefined, text);
  }
  if (isGuestbookPostNotification(item)) {
    return null;
  }
  if (BODY_TEXT_TYPES.has(item.type)) {
    const body = getNotificationBodyText(item);
    if (item.root_type === "moment") {
      // 碎语无独立标题，引用块只展示正文摘录
      const quoteText = getCommentQuoteText(item, body, metadata);
      return nonEmptyQuote(undefined, quoteText);
    }
    const title = commentQuoteTitle(item, rootSnapshot);
    const quoteText = getCommentQuoteText(item, body, metadata);
    return nonEmptyQuote(title, quoteText);
  }
  return null;
}

/** 评论/回复/留言类事件的主体文案。 */
export function getNotificationBodyText(item: NotificationItemResp): string | null {
  if (!BODY_TEXT_TYPES.has(item.type)) return null;
  if (item.source_deleted) return deletedText(item.source_type);
  const excerpt = item.content_excerpt?.trim();
  const sourceText = snapshotText(parseNotificationMetadata(item.metadata).source_snapshot);
  // 评论/回复点赞：正文可从 source_snapshot 取被点赞对象快照。
  if (item.type === "comment_liked" && item.root_type === "moment") {
    return excerpt || sourceText || null;
  }
  return excerpt || sourceText || null;
}

/** 卡片内联点赞 API 路径；无法安全推断时返回 null（如 reply 缺父评论 ID）。 */
export function getNotificationLikeUrl(item: NotificationItemResp): string | null {
  if (item.source_type === "comment" && item.root_type === "article") {
    return `/api/articles/comments/${item.source_id}/like`;
  }
  if (item.source_type === "comment" && item.root_type === "moment") {
    return `/api/moments/comments/${item.source_id}/like`;
  }
  if (item.source_type === "guestbook") {
    return `/api/guestbook/${item.source_id}/like`;
  }
  if (item.source_type === "reply") {
    if (item.root_type === "guestbook") {
      return `/api/guestbook/comments/${item.root_id}/replies/${item.source_id}/like`;
    }
    const commentId = extractCommentIdFromMetadata(item.metadata);
    if (commentId == null) return null;
    if (item.root_type === "article") {
      return `/api/articles/comments/${commentId}/replies/${item.source_id}/like`;
    }
    if (item.root_type === "moment") {
      return `/api/moments/comments/${commentId}/replies/${item.source_id}/like`;
    }
  }
  return null;
}

/** 卡片内联回复 API 路径与 parent_reply_id；与点赞 URL 规则对称，reply 缺父评论 ID 时不猜测。 */
export function getNotificationReplyTarget(
  item: NotificationItemResp,
): NotificationReplyTarget | null {
  if (item.source_type === "guestbook") {
    return {
      url: `/api/guestbook/comments/${item.source_id}/replies`,
      parent_reply_id: 0,
    };
  }
  if (item.source_type === "comment") {
    if (item.root_type === "article") {
      return {
        url: `/api/articles/comments/${item.source_id}/replies`,
        parent_reply_id: 0,
      };
    }
    if (item.root_type === "moment") {
      return {
        url: `/api/moments/comments/${item.source_id}/replies`,
        parent_reply_id: 0,
      };
    }
    if (item.root_type === "guestbook") {
      return {
        url: `/api/guestbook/comments/${item.root_id}/replies`,
        parent_reply_id: item.source_id,
      };
    }
  }
  if (item.source_type === "reply") {
    if (item.root_type === "guestbook") {
      return {
        url: `/api/guestbook/comments/${item.root_id}/replies`,
        parent_reply_id: item.source_id,
      };
    }
    const commentId = extractCommentIdFromMetadata(item.metadata);
    if (commentId == null) return null;
    if (item.root_type === "article") {
      return {
        url: `/api/articles/comments/${commentId}/replies`,
        parent_reply_id: item.source_id,
      };
    }
    if (item.root_type === "moment") {
      return {
        url: `/api/moments/comments/${commentId}/replies`,
        parent_reply_id: item.source_id,
      };
    }
  }
  return null;
}

/** 是否展示卡片底部点赞/回复按钮。 */
export function getNotificationInlineActions(
  item: NotificationItemResp,
): NotificationInlineActions {
  if (getModerationNotificationDecision(item) != null) {
    return { canLike: false, canReply: false };
  }
  if (item.source_deleted || item.root_deleted) {
    return { canLike: false, canReply: false };
  }
  if (!INLINE_ACTION_TYPES.has(item.type)) {
    return { canLike: false, canReply: false };
  }
  return {
    canLike: getNotificationLikeUrl(item) !== null,
    canReply: getNotificationReplyTarget(item) !== null,
  };
}
