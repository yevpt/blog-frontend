// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentReplyResp, CommentReplyPageResp } from "@repo/api";
import { CommentReplies } from "./comment-replies";

vi.mock("@repo/markdown", () => ({
  markdownToHtmlSync: (content: string) => content,
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ userId: 1 })),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("@/hooks/use-comment-like", () => ({
  useCommentLike: () => ({
    toggleReplyLike: vi.fn(() => Promise.resolve({ is_liked: true, like_count: 1 })),
  }),
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => <span data-testid="user-avatar">{name}</span>,
}));

function makeReply(id: number, overrides?: Partial<CommentReplyResp>): CommentReplyResp {
  return {
    id,
    target_type: "article",
    comment_id: 1,
    from_user_id: 1,
    to_user_id: 0,
    parent_reply_id: 0,
    content: `回复 ${id}`,
    from_user: { id: 1, username: "alice", nickname: "Alice" },
    like_count: 0,
    is_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockPage(list: CommentReplyResp[], pages = 1): CommentReplyPageResp {
  return { total: list.length, pages, page: 1, page_size: 5, list };
}

describe("CommentReplies", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("replyCount=0 时不渲染任何内容", () => {
    const { container } = render(
      <CommentReplies commentId={1} targetType="article" replyCount={0} onReply={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("replyCount>0 时显示展开按钮", () => {
    render(<CommentReplies commentId={1} targetType="article" replyCount={5} onReply={vi.fn()} />);
    expect(screen.getByText(/展开 5 条回复/)).toBeTruthy();
  });

  it("点击展开后加载并显示回复列表", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeReply(1), makeReply(3)])),
    } as Response);

    render(<CommentReplies commentId={1} targetType="article" replyCount={2} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 2 条回复/));
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());
    expect(screen.getByText("回复 3")).toBeTruthy();
  });

  it("hasMore 时显示「查看更多回复」", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ total: 10, pages: 2, page: 1, page_size: 5, list: [makeReply(1)] }),
    } as Response);

    render(<CommentReplies commentId={1} targetType="article" replyCount={10} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 10 条回复/));
    await waitFor(() => expect(screen.getByText("查看更多回复")).toBeTruthy());
  });

  it("pendingReply 追加到回复列表中", async () => {
    const user = userEvent.setup();
    const pending: CommentReplyResp = makeReply(99);
    pending.content = "刚刚发布的回复";
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([])),
    } as Response);

    render(
      <CommentReplies
        commentId={1}
        targetType="article"
        replyCount={1}
        pendingReply={pending}
        onReply={vi.fn()}
      />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByText("刚刚发布的回复")).toBeTruthy());
  });

  it("点击回复内的回复按钮触发 onReply", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeReply(1)])),
    } as Response);

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={onReply} />);
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => screen.getByText("回复 1"));

    await user.click(screen.getAllByText("回复")[0]);
    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      parentReplyId: 1,
      toUsername: "Alice",
    });
  });

  it("回复项显示点赞按钮", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeReply(1, { like_count: 3, is_liked: false })])),
    } as Response);

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

    expect(screen.getByTestId("icon-heart")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("点击回复点赞按钮调用 toggleReplyLike 并更新状态", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeReply(1)])),
    } as Response);

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => screen.getByText("回复 1"));

    const likeBtn = screen.getByLabelText("点赞");
    await user.click(likeBtn);
    // toggleReplyLike mock is called (verified by state update showing heart-fill)
    await waitFor(() => expect(screen.getByTestId("icon-heart-fill")).toBeTruthy());
  });

  it("is_liked=true 时回复爱心为实心", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeReply(1, { is_liked: true })])),
    } as Response);

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />);
    (await userEvent.setup()).click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByTestId("icon-heart-fill")).toBeTruthy());
  });
});
