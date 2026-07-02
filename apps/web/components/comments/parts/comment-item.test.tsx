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
  wrapMarkdownImagesWithSkeletonHtml: (h: string) => h,
  deferMarkdownImageSources: (h: string) => h,
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/lib/format-time", () => ({
  formatDateTime: () => "2022-01-03 20:56",
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: (selector?: (s: { open: ReturnType<typeof vi.fn> }) => unknown) => {
    const store = { open: vi.fn() };
    return typeof selector === "function" ? selector(store) : store;
  },
}));

vi.mock("../inputs/inline-reply-editor", () => ({
  InlineReplyEditor: ({
    initialValue = "",
    header,
    onSubmit,
  }: {
    initialValue?: string;
    header?: React.ReactNode;
    onSubmit: (content: string) => Promise<boolean>;
  }) => (
    <div data-testid="inline-reply-editor">
      {header}
      <textarea data-testid="inline-editor-value" readOnly value={initialValue} />
      <button type="button" onClick={() => void onSubmit("内联提交内容")}>
        提交
      </button>
    </div>
  ),
}));

vi.mock("./comment-replies", () => ({
  CommentReplies: (props: {
    replyCount: number;
    onSubmitReply: (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ) => Promise<boolean>;
    pendingReply: CommentReplyResp | null;
  }) => {
    if (props.replyCount <= 0) return null;
    return (
      <div data-testid="comment-replies" data-reply-count={props.replyCount}>
        <button type="button" onClick={() => void props.onSubmitReply(1, 2, "子回复内容")}>
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
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("is_liked=true 时爱心仍为实心样式", () => {
    const liked = { ...baseComment, is_liked: true };
    render(<CommentItem comment={liked} targetType="article" />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("点击爱心触发 onLike 回调", async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<CommentItem comment={baseComment} targetType="article" onLike={onLike} />);

    await user.click(screen.getByRole("button", { name: /点赞/ }));
    expect(onLike).toHaveBeenCalledWith(1);
  });

  it("点击回复展开内联回复框", async () => {
    const user = userEvent.setup();
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        onSubmitReply={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(screen.queryByTestId("inline-reply-editor")).toBeNull();
    await user.click(screen.getByText("回复"));
    expect(screen.getByTestId("inline-reply-editor")).toBeTruthy();
  });

  it("展开回复框后按钮变为取消回复，再次点击收起", async () => {
    const user = userEvent.setup();
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        onSubmitReply={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "回复" }));
    expect(screen.getByTestId("inline-reply-editor")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "回复" })).toBeNull();

    // ReplyBanner 里的取消「×」按钮也叫 aria-label「取消回复」，头部按钮取第一个即可
    await user.click(screen.getAllByRole("button", { name: "取消回复" })[0]!);
    expect(screen.queryByTestId("inline-reply-editor")).toBeNull();
    expect(screen.getByRole("button", { name: "回复" })).toBeTruthy();
  });

  it("内联回复框提交成功后调用 onSubmitReply 并收起", async () => {
    const user = userEvent.setup();
    const onSubmitReply = vi.fn().mockResolvedValue(true);
    render(
      <CommentItem comment={baseComment} targetType="article" onSubmitReply={onSubmitReply} />,
    );

    await user.click(screen.getByText("回复"));
    await user.click(screen.getByText("提交"));

    expect(onSubmitReply).toHaveBeenCalledWith(1, undefined, "内联提交内容");
    expect(screen.queryByTestId("inline-reply-editor")).toBeNull();
  });

  it("未提供 onSubmitReply 时不显示回复按钮", () => {
    render(<CommentItem comment={baseComment} targetType="article" />);
    expect(screen.queryByText("回复")).toBeNull();
  });

  it("仅提供旧版 onReply 时点击回复直接调用回调，不展开内联编辑器", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    render(<CommentItem comment={baseComment} targetType="article" onReply={onReply} />);

    await user.click(screen.getByText("回复"));

    expect(onReply).toHaveBeenCalledWith({ commentId: 1, toUsername: "Alice" });
    expect(screen.queryByTestId("inline-reply-editor")).toBeNull();
  });

  it("当前用户是评论作者时显示删除按钮并二次确认", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "删除评论" }));
    expect(screen.getByText("确定删除这条评论吗？")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("当前用户不是评论作者时不显示删除按钮", () => {
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={99}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "删除评论" })).toBeNull();
  });

  it("作者点击编辑按钮后内联展示编辑器，替换正文显示", async () => {
    const user = userEvent.setup();
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onSubmitEditComment={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑评论" }));
    // mock 的 InlineReplyEditor 用一个 readOnly textarea 展示 initialValue，其内容恰好与被隐藏的正文相同，
    // 默认的 queryByText 会把这个 textarea 也当作候选节点匹配到；用 ignore 选项把 textarea 排除在候选之外，
    // 这样断言真正验证的是「ThreadCommentContent 没有渲染」而不是被 mock 的读数误伤。
    expect(
      screen.queryByText("这篇文章写得很好", { ignore: "script, style, textarea" }),
    ).toBeNull();
    expect(screen.getByTestId("inline-editor-value")).toHaveValue("这篇文章写得很好");
  });

  it("展开编辑框后按钮变为取消编辑，再次点击收起", async () => {
    const user = userEvent.setup();
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onSubmitEditComment={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑评论" }));
    expect(screen.getByTestId("inline-editor-value")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "编辑评论" })).toBeNull();

    // ReplyBanner 里的取消「×」按钮也叫 aria-label「取消编辑」，头部按钮取第一个即可
    await user.click(screen.getAllByRole("button", { name: "取消编辑" })[0]!);
    expect(screen.queryByTestId("inline-editor-value")).toBeNull();
    expect(screen.getByRole("button", { name: "编辑评论" })).toBeTruthy();
  });

  it("内联编辑提交成功后调用 onSubmitEditComment 并恢复正文显示", async () => {
    const user = userEvent.setup();
    const onSubmitEditComment = vi.fn().mockResolvedValue(true);
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onSubmitEditComment={onSubmitEditComment}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑评论" }));
    await user.click(screen.getByText("提交"));

    expect(onSubmitEditComment).toHaveBeenCalledWith(1, "内联提交内容");
    expect(screen.getByText("这篇文章写得很好")).toBeTruthy();
  });

  it("仅提供旧版 onEditComment 时点击编辑直接调用回调，不展开内联编辑器", async () => {
    const user = userEvent.setup();
    const onEditComment = vi.fn();
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={10}
        onEditComment={onEditComment}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑评论" }));

    expect(onEditComment).toHaveBeenCalledWith({
      type: "comment",
      id: 1,
      initialContent: "这篇文章写得很好",
      pendingReview: false,
    });
    expect(screen.queryByTestId("inline-reply-editor")).toBeNull();
  });

  it("非作者不显示编辑按钮", () => {
    render(
      <CommentItem
        comment={baseComment}
        targetType="article"
        currentUserId={99}
        onSubmitEditComment={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "编辑评论" })).toBeNull();
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

  it("转发 onSubmitReply 到 CommentReplies", async () => {
    const user = userEvent.setup();
    const onSubmitReply = vi.fn().mockResolvedValue(true);
    render(
      <CommentItem comment={baseComment} targetType="article" onSubmitReply={onSubmitReply} />,
    );

    await user.click(screen.getByText("回复子评论"));
    expect(onSubmitReply).toHaveBeenCalledWith(1, 2, "子回复内容");
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
    const nicknameLink = screen
      .getAllByRole("link", { name: "Alice" })
      .find((link) => link.textContent === "Alice");
    expect(nicknameLink).toBeTruthy();
    expect(nicknameLink?.getAttribute("href")).toBe("/users/10");
  });

  it("无 user 时昵称为普通文本", () => {
    const comment = { ...baseComment, user: undefined };
    render(<CommentItem comment={comment} targetType="article" />);
    expect(screen.queryByRole("link", { name: "匿名" })).toBeNull();
    expect(screen.getByText("匿名")).toBeTruthy();
  });
});
