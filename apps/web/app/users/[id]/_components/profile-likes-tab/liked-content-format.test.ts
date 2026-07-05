import { describe, it, expect } from "vitest";
import type { UserLikedContentItemResp } from "@repo/api";
import {
  formatLikedContentParentExcerpt,
  formatLikedContentParentLabel,
  formatLikedContentRootContext,
  getKindBadgeLabel,
  getLikedContentActionLabel,
  getLikedContentReplyBodyParts,
  getLikedContentRootHref,
  mapUiFilterToApiType,
  shouldShowLikedContentActionLink,
} from "./liked-content-format";

function makeItem(overrides: Partial<UserLikedContentItemResp> = {}): UserLikedContentItemResp {
  return {
    id: 1,
    liked_at: "2026-06-01T10:00:00Z",
    kind: "article",
    filter: "article",
    author: { id: 2, nickname: "作者" },
    content: { id: 10, excerpt: "摘要", title: "标题" },
    ...overrides,
  };
}

describe("liked-content-format", () => {
  it("mapUiFilterToApiType 将全部映射为 undefined", () => {
    expect(mapUiFilterToApiType("all")).toBeUndefined();
    expect(mapUiFilterToApiType("article")).toBe("article");
    expect(mapUiFilterToApiType("comment")).toBe("comment");
  });

  it("getKindBadgeLabel 返回类型文案", () => {
    expect(getKindBadgeLabel("reply")).toBe("赞过回复");
    expect(getKindBadgeLabel("guestbook")).toBe("赞过留言");
  });

  it("文章跳转地址指向文章详情", () => {
    expect(
      getLikedContentRootHref(makeItem({ kind: "article", content: { id: 99, excerpt: "" } })),
    ).toBe("/articles/99");
  });

  it("评论跳转携带评论锚点", () => {
    const href = getLikedContentRootHref(
      makeItem({
        kind: "comment",
        filter: "comment",
        content: { id: 5, excerpt: "评论正文" },
        root: { kind: "article", id: 20, title: "文章标题" },
      }),
    );
    expect(href).toBe("/articles/20#comment-5");
  });

  it("回复展示 parent 与 root 上下文", () => {
    const item = makeItem({
      kind: "reply",
      filter: "comment",
      content: { id: 12, excerpt: "@某人 回复内容" },
      parent: { kind: "comment", id: 5, excerpt: "父评论摘要" },
      root: { kind: "article", id: 20, title: "文章标题" },
    });

    expect(formatLikedContentParentLabel(item)).toBe("回复自评论");
    expect(formatLikedContentParentExcerpt(item)).toBe("父评论摘要");
    expect(formatLikedContentRootContext(item)).toBe("来自文章：文章标题");
    expect(shouldShowLikedContentActionLink(item)).toBe(false);
  });

  it("getLikedContentReplyBodyParts 用 reply_to 补 @ 并去掉 excerpt 重复前缀", () => {
    const item = makeItem({
      kind: "reply",
      filter: "comment",
      content: { id: 12, excerpt: "111" },
      reply_to: { id: 2, nickname: "VPT" },
    });

    expect(getLikedContentReplyBodyParts(item)).toEqual({
      mention: { name: "VPT", userId: 2 },
      body: "111",
    });
  });

  it("getLikedContentReplyBodyParts 兼容 to_user 字段", () => {
    const item = makeItem({
      kind: "reply",
      filter: "comment",
      content: { id: 12, excerpt: "好的" },
      to_user: { id: 3, username: "alice" },
    });

    expect(getLikedContentReplyBodyParts(item)).toEqual({
      mention: { name: "alice", userId: 3 },
      body: "好的",
    });
  });

  it("内容删除后禁用跳转并显示不可访问", () => {
    const item = makeItem({
      kind: "article",
      content: { id: 10, excerpt: "", deleted: true },
    });

    expect(getLikedContentRootHref(item)).toBeNull();
    expect(getLikedContentActionLabel(item)).toBe("原内容已不可访问");
  });

  it("root 删除后评论类显示不可访问", () => {
    const item = makeItem({
      kind: "comment",
      filter: "comment",
      content: { id: 5, excerpt: "评论" },
      root: { kind: "article", id: 20, deleted: true },
    });

    expect(getLikedContentRootHref(item)).toBeNull();
    expect(formatLikedContentRootContext(item)).toBe("原内容已不可访问");
  });

  it("碎语点赞跳转到碎语详情页", () => {
    expect(
      getLikedContentRootHref(
        makeItem({ kind: "moment", filter: "moment", content: { id: 77, excerpt: "碎语摘要" } }),
      ),
    ).toBe("/moments/77");
  });

  it("碎语已删除时跳转地址为空", () => {
    expect(
      getLikedContentRootHref(
        makeItem({
          kind: "moment",
          filter: "moment",
          content: { id: 77, excerpt: "", deleted: true },
        }),
      ),
    ).toBeNull();
  });

  it("根内容是碎语的评论点赞携带评论锚点跳转到碎语详情页", () => {
    const href = getLikedContentRootHref(
      makeItem({
        kind: "comment",
        filter: "comment",
        content: { id: 5, excerpt: "评论正文" },
        root: { kind: "moment", id: 30, excerpt: "碎语摘要" },
      }),
    );
    expect(href).toBe("/moments/30#comment-5");
  });
});
