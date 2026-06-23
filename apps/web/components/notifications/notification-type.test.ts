import { describe, it, expect } from "vitest";
import type { NotificationItemResp } from "@repo/api";
import { getNotificationVisual, getNotificationSource } from "./notification-type";

function item(over: Partial<NotificationItemResp> = {}): NotificationItemResp {
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
    root_type: "article",
    root_id: 1,
    ...over,
  };
}

describe("getNotificationVisual 胶囊文案按 root", () => {
  it("article → 评论", () => {
    expect(getNotificationVisual(item({ root_type: "article" })).label).toBe("评论");
  });
  it("moment → 碎语", () => {
    expect(getNotificationVisual(item({ root_type: "moment" })).label).toBe("碎语");
  });
  it("guestbook → 留言", () => {
    expect(getNotificationVisual(item({ root_type: "guestbook" })).label).toBe("留言");
  });
  it("未知 root → 通知/bell/中性", () => {
    expect(getNotificationVisual(item({ root_type: "unknown", type: "" }))).toMatchObject({
      label: "通知",
      icon: "bell",
      tone: "neutral",
    });
  });
});

describe("getNotificationVisual 图标与配色按互动类型", () => {
  it("点赞 → heart-line + 粉（不分 root）", () => {
    expect(getNotificationVisual(item({ root_type: "moment", type: "like" }))).toMatchObject({
      icon: "heart-line",
      tone: "pink",
    });
    expect(getNotificationVisual(item({ root_type: "article", type: "like" }))).toMatchObject({
      icon: "heart-line",
      tone: "pink",
    });
  });
  it("评论/回复 → message-circle-line + 紫（不分 root）", () => {
    expect(getNotificationVisual(item({ root_type: "moment", type: "reply" }))).toMatchObject({
      icon: "message-circle-line",
      tone: "purple",
    });
    expect(getNotificationVisual(item({ root_type: "article", type: "comment" }))).toMatchObject({
      icon: "message-circle-line",
      tone: "purple",
    });
  });
  it("source_type=like 也识别为赞", () => {
    expect(
      getNotificationVisual(item({ root_type: "moment", type: "", source_type: "like" })),
    ).toMatchObject({
      icon: "heart-line",
      tone: "pink",
    });
  });
  it("guestbook 无互动 → pen + 蓝色线性风格", () => {
    expect(getNotificationVisual(item({ root_type: "guestbook", type: "" }))).toMatchObject({
      icon: "pen",
      tone: "sky",
    });
  });
});

describe("getNotificationSource", () => {
  it("article 优先使用 root_title", () => {
    expect(
      getNotificationSource(item({ root_type: "article", root_title: "直接给出的标题" })),
    ).toBe("来自《直接给出的标题》");
  });
  it("article 从 metadata 取标题（多 key 兜底）", () => {
    expect(
      getNotificationSource(
        item({ root_type: "article", metadata: '{"root_title":"如何设计通知系统"}' }),
      ),
    ).toBe("来自《如何设计通知系统》");
    expect(
      getNotificationSource(item({ root_type: "article", metadata: '{"article_title":"X"}' })),
    ).toBe("来自《X》");
  });
  it("article 无可用标题 → 来自文章", () => {
    expect(getNotificationSource(item({ root_type: "article", metadata: '{"recipient":1}' }))).toBe(
      "来自文章",
    );
    expect(getNotificationSource(item({ root_type: "article", metadata: undefined }))).toBe(
      "来自文章",
    );
  });
  it("moment / guestbook 固定来源", () => {
    expect(getNotificationSource(item({ root_type: "moment" }))).toBe("来自碎语");
    expect(getNotificationSource(item({ root_type: "guestbook" }))).toBe("来自留言板");
  });
});
