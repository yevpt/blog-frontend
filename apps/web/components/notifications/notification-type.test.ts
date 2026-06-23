import { describe, it, expect } from "vitest";
import type { NotificationItemResp } from "@repo/api";
import {
  extractCommentIdFromMetadata,
  getNotificationActionText,
  getNotificationActorName,
  getNotificationBodyText,
  getNotificationInlineActions,
  getNotificationLikeUrl,
  getNotificationQuote,
  getNotificationReplyTarget,
} from "./notification-type";

function item(over: Partial<NotificationItemResp> = {}): NotificationItemResp {
  return {
    id: 1,
    event_id: 1,
    type: "comment_created",
    title: "t",
    content_excerpt: "",
    is_read: false,
    created_at: "",
    source_type: "comment",
    source_id: 0,
    root_type: "article",
    root_id: 1,
    source_deleted: false,
    root_deleted: false,
    ...over,
  };
}

describe("getNotificationActorName", () => {
  it("使用 actor_user 昵称", () => {
    expect(getNotificationActorName(item({ actor_user: { id: 2, nickname: " Alice " } }))).toBe(
      "Alice",
    );
  });
  it("非系统事件无操作人时回退用户", () => {
    expect(getNotificationActorName(item())).toBe("用户");
  });
  it("系统通知无操作人时回退系统通知", () => {
    expect(getNotificationActorName(item({ type: "system_notice" }))).toBe("系统通知");
  });
});

describe("getNotificationActionText", () => {
  it("article_liked", () => {
    expect(getNotificationActionText(item({ type: "article_liked" }))).toBe("赞了你的文章");
  });
  it("moment_liked", () => {
    expect(getNotificationActionText(item({ type: "moment_liked" }))).toBe("赞了你的碎语");
  });
  it("comment_created 文章", () => {
    expect(getNotificationActionText(item({ type: "comment_created", root_type: "article" }))).toBe(
      "评论了你的文章",
    );
  });
  it("reply_created 文章", () => {
    expect(getNotificationActionText(item({ type: "reply_created", root_type: "article" }))).toBe(
      "回复了文章下你的评论",
    );
  });
  it("guestbook_created", () => {
    expect(getNotificationActionText(item({ type: "guestbook_created" }))).toBe("发表了留言");
  });
  it("comment_liked 文章", () => {
    expect(getNotificationActionText(item({ type: "comment_liked" }))).toBe("赞了你的评论");
  });
  it("comment_liked 碎语", () => {
    expect(getNotificationActionText(item({ type: "comment_liked", root_type: "moment" }))).toBe(
      "赞了你给碎语发表的评论",
    );
  });
  it("未知类型回退 title", () => {
    expect(getNotificationActionText(item({ type: "weird", title: "自定义标题" }))).toBe(
      "自定义标题",
    );
  });
});

describe("getNotificationQuote", () => {
  it("article_liked 使用 root_snapshot 标题与摘要", () => {
    expect(
      getNotificationQuote(
        item({
          type: "article_liked",
          content_excerpt: "",
          metadata:
            '{"root_snapshot":{"type":"article","id":1,"title":"文章标题","excerpt":"正文摘录"}}',
        }),
      ),
    ).toEqual({ title: "文章标题", text: "正文摘录" });
  });
  it("moment_liked 只展示碎语正文，不重复标题", () => {
    expect(
      getNotificationQuote(
        item({
          type: "moment_liked",
          content_excerpt: "内容",
        }),
      ),
    ).toEqual({ title: undefined, text: "内容" });
    expect(
      getNotificationQuote(
        item({
          type: "moment_liked",
          content_excerpt: "",
          metadata: '{"root_snapshot":{"type":"moment","id":1,"excerpt":"只有正文"}}',
        }),
      ),
    ).toEqual({ title: undefined, text: "只有正文" });
    expect(getNotificationQuote(item({ type: "moment_liked", content_excerpt: "" }))).toBeNull();
  });
  it("snapshot 中 HTML img 摘录转为 [图片] 纯文本", () => {
    expect(
      getNotificationQuote(
        item({
          type: "comment_created",
          root_type: "moment",
          content_excerpt: "新评论",
          metadata:
            '{"root_snapshot":{"type":"moment","id":1,"excerpt":"<img src=\\"123\\" onerror=\\"alert(1)\\"/>"}}',
        }),
      ),
    ).toEqual({ title: undefined, text: "图片无法加载" });
  });
  it("comment_created 碎语使用 root_snapshot 展示根内容摘录", () => {
    expect(
      getNotificationQuote(
        item({
          type: "comment_created",
          root_type: "moment",
          content_excerpt: "写得真好",
          metadata: '{"root_snapshot":{"type":"moment","id":1,"excerpt":"碎语正文"}}',
        }),
      ),
    ).toEqual({ title: undefined, text: "碎语正文" });
  });
  it("reply_created 碎语展示被回复评论摘录", () => {
    expect(
      getNotificationQuote(
        item({
          type: "reply_created",
          root_type: "moment",
          content_excerpt: "新的回复",
          metadata:
            '{"root_snapshot":{"type":"moment","id":1,"excerpt":"碎语正文"},"quote_snapshot":{"type":"comment","id":8,"excerpt":"原来的评论"}}',
        }),
      ),
    ).toEqual({ title: undefined, text: "原来的评论" });
  });
  it("comment_created 文章返回 root_snapshot 标题与摘要", () => {
    expect(
      getNotificationQuote(
        item({
          type: "comment_created",
          root_type: "article",
          content_excerpt: "写得真好",
          metadata:
            '{"root_snapshot":{"type":"article","id":1,"title":"设计系统","excerpt":"文章正文摘录"}}',
        }),
      ),
    ).toEqual({ title: "《设计系统》", text: "文章正文摘录" });
  });
  it("reply_created 留言板只展示被回复评论摘录", () => {
    expect(
      getNotificationQuote(
        item({
          type: "reply_created",
          root_type: "guestbook",
          content_excerpt: "新的回复",
          metadata:
            '{"root_snapshot":{"type":"guestbook","id":8,"excerpt":"根留言正文"},"quote_snapshot":{"type":"comment","id":8,"excerpt":"原来的留言评论"}}',
        }),
      ),
    ).toEqual({ title: undefined, text: "原来的留言评论" });
  });
  it("comment_liked 碎语展示 root_snapshot 摘录引用块", () => {
    expect(
      getNotificationQuote(
        item({
          type: "comment_liked",
          root_type: "moment",
          metadata:
            '{"source_snapshot":{"type":"comment","id":8,"excerpt":"被点赞的评论"},"root_snapshot":{"type":"moment","id":1,"excerpt":"碎语正文"}}',
        }),
      ),
    ).toEqual({ title: undefined, text: "碎语正文" });
  });
  it("source 已删除时保留根对象标题", () => {
    expect(
      getNotificationQuote(
        item({
          type: "comment_liked",
          root_type: "article",
          source_deleted: true,
          metadata:
            '{"source_snapshot":{"type":"comment","id":8,"excerpt":"旧评论"},"root_snapshot":{"type":"article","id":1,"title":"设计系统"}}',
        }),
      ),
    ).toEqual({ title: "《设计系统》", text: "" });
  });
  it("root 已删除时展示明确删除文案", () => {
    expect(
      getNotificationQuote(
        item({
          type: "comment_created",
          root_type: "article",
          root_deleted: true,
          content_excerpt: "写得真好",
          metadata: '{"root_snapshot":{"type":"article","id":1,"title":"设计系统"}}',
        }),
      ),
    ).toEqual({ title: "《设计系统》", text: "文章已删除" });
  });
  it("guestbook_created 不展示留言板引用块", () => {
    expect(
      getNotificationQuote(
        item({
          type: "guestbook_created",
          root_type: "guestbook",
          content_excerpt: "新留言内容",
        }),
      ),
    ).toBeNull();
  });
  it("comment_created 留言板不展示留言板引用块", () => {
    expect(
      getNotificationQuote(
        item({
          type: "comment_created",
          root_type: "guestbook",
          content_excerpt: "新留言内容",
        }),
      ),
    ).toBeNull();
  });
});

describe("getNotificationBodyText", () => {
  it("评论类事件返回 content_excerpt", () => {
    expect(
      getNotificationBodyText(item({ type: "comment_created", content_excerpt: "评论正文" })),
    ).toBe("评论正文");
  });
  it("comment_liked 碎语从 metadata.source_snapshot 取评论正文", () => {
    expect(
      getNotificationBodyText(
        item({
          type: "comment_liked",
          root_type: "moment",
          content_excerpt: "",
          metadata: '{"source_snapshot":{"type":"comment","id":8,"excerpt":"被点赞的评论内容"}}',
        }),
      ),
    ).toBe("被点赞的评论内容");
  });
  it("source 已删除时正文展示删除文案", () => {
    expect(
      getNotificationBodyText(
        item({
          type: "reply_created",
          source_type: "reply",
          source_deleted: true,
          content_excerpt: "旧回复",
        }),
      ),
    ).toBe("回复已删除");
  });
  it("文章点赞无正文", () => {
    expect(getNotificationBodyText(item({ type: "article_liked" }))).toBeNull();
  });
  it("guestbook_created 保留原始摘录供渲染层处理", () => {
    const excerpt = '<img src="123" onerror="alert(1)"/>';
    expect(
      getNotificationBodyText(item({ type: "guestbook_created", content_excerpt: excerpt })),
    ).toBe(excerpt);
  });
});

describe("getNotificationInlineActions", () => {
  it("文章/碎语点赞不展示内联操作", () => {
    expect(getNotificationInlineActions(item({ type: "article_liked" }))).toEqual({
      canLike: false,
      canReply: false,
    });
    expect(getNotificationInlineActions(item({ type: "moment_liked" }))).toEqual({
      canLike: false,
      canReply: false,
    });
  });
  it("评论/回复/留言类事件展示内联操作", () => {
    expect(
      getNotificationInlineActions(
        item({
          type: "comment_created",
          source_type: "comment",
          root_type: "article",
          source_id: 9,
        }),
      ),
    ).toEqual({ canLike: true, canReply: true });
  });
  it("source 或 root 已删除时不展示内联操作", () => {
    expect(
      getNotificationInlineActions(
        item({
          type: "comment_created",
          source_type: "comment",
          root_type: "article",
          source_id: 9,
          source_deleted: true,
        }),
      ),
    ).toEqual({ canLike: false, canReply: false });
    expect(
      getNotificationInlineActions(
        item({
          type: "comment_created",
          source_type: "comment",
          root_type: "article",
          source_id: 9,
          root_deleted: true,
        }),
      ),
    ).toEqual({ canLike: false, canReply: false });
  });
  it("评论/回复/留言点赞不展示内联操作", () => {
    expect(
      getNotificationInlineActions(
        item({
          type: "comment_liked",
          source_type: "comment",
          root_type: "article",
          source_id: 9,
        }),
      ),
    ).toEqual({ canLike: false, canReply: false });
    expect(
      getNotificationInlineActions(
        item({ type: "reply_liked", source_type: "reply", source_id: 9 }),
      ),
    ).toEqual({ canLike: false, canReply: false });
    expect(
      getNotificationInlineActions(
        item({
          type: "reply_liked",
          source_type: "reply",
          source_id: 9,
          root_type: "article",
          metadata: '{"comment_id":5}',
        }),
      ),
    ).toEqual({ canLike: false, canReply: false });
    expect(
      getNotificationInlineActions(
        item({
          type: "guestbook_liked",
          source_type: "guestbook",
          source_id: 3,
        }),
      ),
    ).toEqual({ canLike: false, canReply: false });
  });
});

describe("extractCommentIdFromMetadata", () => {
  it("解析数字 comment_id", () => {
    expect(extractCommentIdFromMetadata('{"comment_id":42}')).toBe(42);
  });
  it("解析字符串 comment_id", () => {
    expect(extractCommentIdFromMetadata('{"comment_id":"7"}')).toBe(7);
  });
  it("无效元数据返回 null", () => {
    expect(extractCommentIdFromMetadata("not-json")).toBeNull();
    expect(extractCommentIdFromMetadata(undefined)).toBeNull();
  });
});

describe("getNotificationLikeUrl", () => {
  it("文章评论点赞路径", () => {
    expect(
      getNotificationLikeUrl(item({ source_type: "comment", root_type: "article", source_id: 42 })),
    ).toBe("/api/articles/comments/42/like");
  });
  it("reply 无父评论 ID 时返回 null", () => {
    expect(getNotificationLikeUrl(item({ source_type: "reply", source_id: 1 }))).toBeNull();
  });
  it("文章回复点赞路径", () => {
    expect(
      getNotificationLikeUrl(
        item({
          source_type: "reply",
          source_id: 12,
          root_type: "article",
          metadata: '{"comment_id":5}',
        }),
      ),
    ).toBe("/api/articles/comments/5/replies/12/like");
  });
  it("留言回复点赞路径使用 root_id", () => {
    expect(
      getNotificationLikeUrl(
        item({
          source_type: "reply",
          source_id: 12,
          root_type: "guestbook",
          root_id: 3,
        }),
      ),
    ).toBe("/api/guestbook/comments/3/replies/12/like");
  });
});

describe("getNotificationReplyTarget", () => {
  it("文章评论回复路径", () => {
    expect(
      getNotificationReplyTarget(
        item({ source_type: "comment", root_type: "article", source_id: 42 }),
      ),
    ).toEqual({
      url: "/api/articles/comments/42/replies",
      parent_reply_id: 0,
    });
  });
  it("碎语评论回复路径", () => {
    expect(
      getNotificationReplyTarget(
        item({ source_type: "comment", root_type: "moment", source_id: 7 }),
      ),
    ).toEqual({
      url: "/api/moments/comments/7/replies",
      parent_reply_id: 0,
    });
  });
  it("留言回复路径", () => {
    expect(
      getNotificationReplyTarget(
        item({ source_type: "guestbook", source_id: 8, root_type: "guestbook" }),
      ),
    ).toEqual({
      url: "/api/guestbook/comments/8/replies",
      parent_reply_id: 0,
    });
  });
  it("文章跟评回复路径", () => {
    expect(
      getNotificationReplyTarget(
        item({
          source_type: "reply",
          source_id: 12,
          root_type: "article",
          metadata: '{"comment_id":5}',
        }),
      ),
    ).toEqual({
      url: "/api/articles/comments/5/replies",
      parent_reply_id: 12,
    });
  });
  it("留言板跟评回复路径使用 root_id", () => {
    expect(
      getNotificationReplyTarget(
        item({
          source_type: "reply",
          source_id: 12,
          root_type: "guestbook",
          root_id: 3,
        }),
      ),
    ).toEqual({
      url: "/api/guestbook/comments/3/replies",
      parent_reply_id: 12,
    });
  });
  it("reply 无父评论 ID 时返回 null", () => {
    expect(getNotificationReplyTarget(item({ source_type: "reply", source_id: 1 }))).toBeNull();
  });
});
