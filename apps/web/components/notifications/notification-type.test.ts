import { describe, it, expect } from "vitest";
import type { NotificationItemResp } from "@repo/api";
import { getNotificationVisual } from "./notification-type";

function item(root_type: string): NotificationItemResp {
  return {
    id: 1,
    event_id: 1,
    type: "comment",
    title: "t",
    content_excerpt: "",
    is_read: false,
    created_at: "",
    source_type: "",
    source_id: 0,
    root_type,
    root_id: 1,
  };
}

describe("getNotificationVisual", () => {
  it("article → 评论/紫", () => {
    expect(getNotificationVisual(item("article"))).toMatchObject({
      label: "评论",
      tone: "primary",
    });
  });
  it("moment → 碎语/粉", () => {
    expect(getNotificationVisual(item("moment"))).toMatchObject({ label: "碎语", tone: "pink" });
  });
  it("guestbook → 留言/中性", () => {
    expect(getNotificationVisual(item("guestbook"))).toMatchObject({
      label: "留言",
      tone: "neutral",
    });
  });
  it("未知 → 通知/bell", () => {
    expect(getNotificationVisual(item("unknown"))).toMatchObject({ label: "通知", icon: "bell" });
  });
});
