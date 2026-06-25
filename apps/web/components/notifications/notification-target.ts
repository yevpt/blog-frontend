import type { NotificationItemResp } from "@repo/api";

export function getNotificationHref(item: NotificationItemResp): string {
  if (item.root_deleted) {
    return "/notifications";
  }
  if (item.root_type === "article") {
    return `/articles/${item.root_id}`;
  }
  if (item.root_type === "moment") {
    return "/moments";
  }
  if (item.root_type === "guestbook") {
    return "/guestbook";
  }
  return "/notifications";
}
