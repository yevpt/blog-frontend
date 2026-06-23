import type { NotificationItemResp } from "@repo/api";
import type { IconName } from "@repo/icons";

export interface NotificationVisual {
  icon: IconName;
  label: string;
  tone: "primary" | "pink" | "neutral";
}

/** 按 root_type 映射通知的图标/胶囊文案/配色，未知类型落到系统通知兜底。 */
export function getNotificationVisual(item: NotificationItemResp): NotificationVisual {
  switch (item.root_type) {
    case "article":
      return { icon: "message-circle", label: "评论", tone: "primary" };
    case "moment":
      return { icon: "heart", label: "碎语", tone: "pink" };
    case "guestbook":
      return { icon: "edit", label: "留言", tone: "neutral" };
    default:
      return { icon: "bell", label: "通知", tone: "neutral" };
  }
}

/** tone → Tailwind 配色类（图标底色 + 胶囊），集中管理避免散落各组件。 */
export const TONE_CLASS: Record<NotificationVisual["tone"], { iconWrap: string; pill: string }> = {
  primary: { iconWrap: "bg-primary/10 text-primary", pill: "bg-primary/10 text-primary" },
  pink: { iconWrap: "bg-pink-500/10 text-pink-600", pill: "bg-pink-500/10 text-pink-600" },
  neutral: { iconWrap: "bg-muted text-muted-foreground", pill: "bg-muted text-muted-foreground" },
};
