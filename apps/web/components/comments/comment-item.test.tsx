// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { CommentItem } from "./comment-item";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/markdown", () => ({
  markdownToHtmlSync: (content: string) => content,
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("./comment-replies", () => ({
  CommentReplies: (props: {
    replyCount: number;
    onReply: (target: unknown) => void;
    pendingReply: CommentReplyResp | null;
  }) => {
    if (props.replyCount <= 0) return null;
    return (
      <div data-testid="comment-replies" data-reply-count={props.replyCount}>
        <button
          type="button"
          onClick={() => props.onReply({ commentId: 1, parentReplyId: 2, toUsername: "Bob" })}
        >
          回复子评论
        </button>
        {props.pendingReply && <span data-testid="pending-in-comment">pending</span>}
      </div>
    );
  },
}));

const baseComment: CommentItemResp = {
  id: 1,
  target_type: "article",
  target_id: 5,
  user_id: 10,
  content: "这篇文章写得很好",
  user: { id: 10, username: "alice", nickname: "Alice" },
  reply_count: 3,
  like_count: 5,
  is_liked: false,
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

describe("CommentItem", () => {
  it("显示评论者昵称和评论内容", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("这篇文章写得很好")).toBeTruthy();
  });

  it("无昵称时显示 username", () => {
    const comment = {
      ...baseComment,
      user: { id: 10, username: "alice" },
    };
    render(<CommentItem comment={comment} targetType="article" />);
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("显示点赞数和爱心图标", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.getByTestId("icon-heart")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("is_liked=true 时爱心图标显示为实心", () => {
    const liked = { ...baseComment, is_liked: true };
    render(<CommentItem comment={liked} targetType="article" />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("点击爱心触发 onLike 回调", async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<CommentItem comment={baseComment} targetType="article" onLike={onLike} />);

    await user.click(screen.getByTestId("icon-heart").closest("button")!);
    expect(onLike).toHaveBeenCalledWith(1);
  });

  it("点击回复触发 onReply 回调", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<CommentItem comment={baseComment} targetType="article" onReply={onReply} />);

    await user.click(screen.getByText("回复"));
    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      toUsername: "Alice",
    });
  });

  it("reply_count>0 时渲染 CommentReplies", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.getByTestId("comment-replies")).toBeTruthy();
    expect(screen.getByTestId("comment-replies").dataset.replyCount).toBe("3");
  });

  it("reply_count=0 时不渲染 CommentReplies", () => {
    const noReply = { ...baseComment, reply_count: 0 };
    render(<CommentItem comment={noReply} targetType="article" />);
    expect(screen.queryByTestId("comment-replies")).toBeNull();
  });

  it("转发 onReply 到 CommentReplies", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<CommentItem comment={baseComment} targetType="article" onReply={onReply} />);

    await user.click(screen.getByText("回复子评论"));
    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      parentReplyId: 2,
      toUsername: "Bob",
    });
  });

  it("pendingReply 传递给 CommentReplies", () => {
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        pendingReply={{ id: 99 } as CommentReplyResp}
      />,
    );
    expect(screen.getByTestId("pending-in-comment")).toBeTruthy();
  });

  it("渲染 data-comment-id 属性", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    const el = screen.getByText("这篇文章写得很好").closest("[data-comment-id]");
    expect(el?.getAttribute("data-comment-id")).toBe("1");
  });

  it("有 user 时昵称渲染为跳转链接", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    const link = screen.getByRole("link", { name: "Alice" });
    expect(link.getAttribute("href")).toBe("/users/10");
  });

  it("无 user 时昵称为普通文本", () => {
    const comment = { ...baseComment, user: undefined };
    render(<CommentItem comment={comment} targetType="article" />);
    expect(screen.queryByRole("link", { name: "匿名" })).toBeNull();
    expect(screen.getByText("匿名")).toBeTruthy();
  });
});
