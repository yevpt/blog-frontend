import { describe, expect, it } from "vitest";
import type { NotificationItemResp } from "@repo/api";
import { getNotificationHref } from "./notification-target";

function item(overrides: Partial<NotificationItemResp>): NotificationItemResp {
  return {
    id: 1,
    event_id: 10,
    type: "comment_created",
    title: "",
    content_excerpt: "",
    is_read: false,
    created_at: "2026-06-23T00:00:00Z",
    source_type: "comment",
    source_id: 2,
    root_type: "article",
    root_id: 3,
    source_deleted: false,
    root_deleted: false,
    ...overrides,
  };
}

describe("getNotificationHref", () => {
  it("article 通知跳转文章详情", () => {
    expect(getNotificationHref(item({ root_type: "article", root_id: 42 }))).toBe("/articles/42");
  });

  it("moment 通知跳转碎语页而不是圈子页", () => {
    expect(getNotificationHref(item({ root_type: "moment", root_id: 9 }))).toBe("/moments");
  });

  it("guestbook 通知跳转留言页", () => {
    expect(getNotificationHref(item({ root_type: "guestbook", root_id: 5 }))).toBe("/guestbook");
  });

  it("未知通知回退到消息页", () => {
    expect(getNotificationHref(item({ root_type: "unknown", root_id: 5 }))).toBe("/notifications");
  });

  it("根对象已删除时回退到消息页", () => {
    expect(
      getNotificationHref(item({ root_type: "article", root_id: 42, root_deleted: true })),
    ).toBe("/notifications");
  });

  it("审核 system_notice 停留在消息页", () => {
    expect(
      getNotificationHref(
        item({
          type: "system_notice",
          source_type: "system",
          root_type: "system",
          metadata: '{"moderation":{"item_id":10,"decision":"approved"}}',
        }),
      ),
    ).toBe("/notifications");
  });
});
