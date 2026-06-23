import type { NotificationItemResp } from "@repo/api";
import type { IconName } from "@repo/icons";

export interface NotificationVisual {
  icon: IconName;
  label: string;
  tone: "purple" | "pink" | "sky" | "neutral";
}

/** 从 type/source_type 判断互动类型，决定图标语义（赞 vs 评论/回复）。 */
export function getInteractionKind(item: NotificationItemResp): "like" | "comment" | null {
  const typeStr = (item.type || "").toLowerCase();
  const sourceStr = (item.source_type || "").toLowerCase();
  if (typeStr.includes("like") || sourceStr === "like") return "like";
  if (
    typeStr.includes("reply") ||
    typeStr.includes("comment") ||
    sourceStr === "comment" ||
    sourceStr === "reply"
  ) {
    return "comment";
  }
  return null;
}

/** root_type → 胶囊文案 / 无互动时的兜底图标（配色不在此，统一由图标语义决定）。 */
const ROOT_VISUAL: Record<string, { label: string; icon: IconName }> = {
  article: { label: "评论", icon: "message-circle" },
  moment: { label: "碎语", icon: "message-circle" },
  guestbook: { label: "留言", icon: "pen" },
};

/** 图标 → 配色：颜色跟随图标语义（评论=紫、点赞=粉、其它=中性），保证图标与圈色一致。 */
function toneForIcon(icon: IconName): NotificationVisual["tone"] {
  if (icon === "heart") return "pink";
  if (icon === "message-circle") return "purple";
  if (icon === "pen") return "sky";
  return "neutral";
}

/**
 * 图标按互动类型（赞→heart、评论/回复→message-circle）优先、root 兜底；
 * 配色跟随图标语义；胶囊文案按 root 对象类型；未知类型落到系统通知兜底。
 */
export function getNotificationVisual(item: NotificationItemResp): NotificationVisual {
  const root = ROOT_VISUAL[item.root_type] ?? { label: "通知", icon: "bell" as IconName };
  const kind = getInteractionKind(item);
  const icon: IconName =
    kind === "like" ? "heart" : kind === "comment" ? "message-circle" : root.icon;
  return { icon, label: root.label, tone: toneForIcon(icon) };
}

/**
 * tone → Tailwind 配色类（图标底色 + 胶囊），对齐设计稿的淡雅紫/粉，并适配深色模式。
 * 紫≈violet-100/700（demo #EEEDFE/#534AB7），粉≈rose-100/700（demo #FBEAF0/#993556）。
 */
export const TONE_CLASS: Record<
  NotificationVisual["tone"],
  { iconWrap: { unread: string; read: string }; pill: string }
> = {
  purple: {
    iconWrap: {
      unread: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
      read: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400",
    },
    pill: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  },
  pink: {
    iconWrap: {
      unread: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
      read: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400",
    },
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
  sky: {
    iconWrap: {
      unread: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
      read: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400",
    },
    pill: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  neutral: {
    iconWrap: {
      unread: "bg-muted text-muted-foreground",
      read: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400",
    },
    pill: "bg-muted text-muted-foreground",
  },
};

/** 从 metadata JSON 中尽量取出来源标题，后端字段命名不定，多 key 兜底扫描。 */
function extractMetaTitle(metadata?: string): string | null {
  if (!metadata) return null;
  try {
    const meta = JSON.parse(metadata) as Record<string, unknown>;
    const keys = ["article_title", "root_title", "title", "post_title", "subject", "name"];
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  } catch {
    // 元数据非 JSON 时忽略，落到默认来源文案
  }
  return null;
}

export interface NotificationSourceParts {
  prefix: string;
  title?: string;
}

export function getNotificationSourceParts(
  item: NotificationItemResp,
): NotificationSourceParts | null {
  if (item.root_type === "article") {
    const title = item.root_title || extractMetaTitle(item.metadata);
    if (title) return { prefix: "来自", title };
    return { prefix: "来自文章" };
  }
  if (item.root_type === "moment") return { prefix: "来自碎语" };
  if (item.root_type === "guestbook") return { prefix: "来自留言板" };
  return null;
}

export function getNotificationSource(item: NotificationItemResp): string | null {
  const parts = getNotificationSourceParts(item);
  if (!parts) return null;
  return parts.title ? `${parts.prefix}《${parts.title}》` : parts.prefix;
}

export function getNotificationTitle(item: NotificationItemResp): string {
  if (item.title) return item.title;

  const kind = getInteractionKind(item);
  const isLike = kind === "like";
  const isReplyOrComment = kind === "comment";

  const typeStr = (item.type || "").toLowerCase();
  const sourceStr = (item.source_type || "").toLowerCase();
  const isReply = typeStr.includes("reply") || sourceStr.includes("reply");

  if (item.root_type === "article") {
    if (isLike) return "你的文章收到一个赞";
    if (isReplyOrComment) {
      return isReply ? "有人回复了你的评论" : "有人评论了你的文章";
    }
    return "你的文章有了新动态";
  }
  if (item.root_type === "moment") {
    if (isLike) return "你的碎语收到一个赞";
    if (isReplyOrComment) {
      return isReply ? "有人回复了你的碎语" : "有人评论了你的碎语";
    }
    return "你的碎语有了新互动";
  }
  if (item.root_type === "guestbook") {
    if (isLike) return "你的留言收到一个赞";
    if (isReplyOrComment || typeStr.includes("message") || sourceStr.includes("message")) {
      return isReply ? "有人在留言板回复了你" : "有人在留言板给你留言";
    }
    return "留言板有了新动态";
  }

  // 兜底：如果 root_type 为空但互动类型是留言
  if (sourceStr === "guestbook_message" || typeStr === "guestbook_message_created") {
    return "有人在留言板给你留言";
  }

  return "你有一条新消息";
}
