// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { ModalComments } from "./modal-comments";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));
vi.mock("@repo/ui", async () => {
  const actual = await vi.importActual("@repo/ui");
  const mockAddToast = vi.fn();
  return {
    ...actual,
    Button: ({
      children,
      onPress,
      isDisabled,
      ...props
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      isDisabled?: boolean;
      [key: string]: unknown;
    }) => (
      <button type="button" onClick={onPress} disabled={isDisabled} {...props}>
        {children}
      </button>
    ),
    Modal: ({
      isOpen,
      children,
      onOpenChange,
      "aria-label": ariaLabel,
    }: {
      isOpen?: boolean;
      children: React.ReactNode | ((opts: { close: () => void }) => React.ReactNode);
      onOpenChange?: (open: boolean) => void;
      "aria-label"?: string;
    }) =>
      isOpen ? (
        <div role="dialog" aria-label={ariaLabel}>
          {typeof children === "function"
            ? children({ close: () => onOpenChange?.(false) })
            : children}
        </div>
      ) : null,
    addToast: mockAddToast,
  };
});
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));
vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: (selector?: (s: { open: ReturnType<typeof vi.fn> }) => unknown) => {
    const store = { open: vi.fn() };
    return typeof selector === "function" ? selector(store) : store;
  },
}));
vi.mock("../parts/comment-replies", () => ({
  CommentReplies: () => null,
}));
vi.mock("../parts/comment-item", () => ({
  CommentItem: ({
    comment,
    onReply,
    onEditComment,
    activeReplyTarget,
    activeEditTarget,
    onCancelReply,
    onCancelEdit,
  }: {
    comment: CommentItemResp;
    onReply?: (target: { commentId: number; parentReplyId?: number; toUsername: string }) => void;
    onEditComment?: (target: {
      type: "comment";
      id: number;
      initialContent: string;
      pendingReview: boolean;
    }) => void;
    activeReplyTarget?: { commentId: number; parentReplyId?: number; toUsername: string } | null;
    activeEditTarget?: { type: "comment"; id: number } | null;
    onCancelReply?: () => void;
    onCancelEdit?: () => void;
  }) => {
    const isReplying =
      activeReplyTarget != null &&
      activeReplyTarget.commentId === comment.id &&
      activeReplyTarget.parentReplyId == null;
    const isEditing =
      activeEditTarget != null &&
      activeEditTarget.type === "comment" &&
      activeEditTarget.id === comment.id;
    return (
      <div data-testid="comment-item" data-comment-id={comment.id}>
        {comment.content}
        {onReply &&
          (isReplying ? (
            <button type="button" onClick={() => onCancelReply?.()}>
              取消回复
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                onReply({
                  commentId: comment.id,
                  toUsername: comment.user?.nickname ?? comment.user?.username ?? "匿名",
                })
              }
            >
              回复
            </button>
          ))}
        {onEditComment &&
          (isEditing ? (
            <button type="button" onClick={() => onCancelEdit?.()}>
              取消编辑
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                onEditComment({
                  type: "comment",
                  id: comment.id,
                  initialContent: comment.moderation?.pending_content ?? comment.content,
                  pendingReview: Boolean(comment.moderation?.has_pending_revision),
                })
              }
            >
              编辑评论
            </button>
          ))}
      </div>
    );
  },
}));
vi.mock("../parts/comment-skeleton", () => ({
  CommentListSkeleton: () => <div data-testid="comment-list-skeleton" />,
}));

function makeComment(id: number, overrides?: Partial<CommentItemResp>): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: 1,
    content: `评论内容 ${id}`,
    user: { id: 1, username: "alice", nickname: "Alice" },
    reply_count: 0,
    like_count: 0,
    is_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockPage(list: CommentItemResp[], pages = 1): CommentPageResp {
  return { total: list.length, pages, page: 1, page_size: 10, list };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("ModalComments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(mockPage([makeComment(1), makeComment(2)])));
  });

  it("加载并渲染评论列表", async () => {
    render(<ModalComments targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
    expect(screen.getByText("评论内容 2")).toBeTruthy();
  });

  it("moment targetType 正常工作", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(mockPage([makeComment(1, { target_type: "moment" })])),
    );
    render(<ModalComments targetType="moment" targetId={5} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
  });

  it("暂无评论时显示提示文案", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([])));
    render(<ModalComments targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText(/暂无评论/)).toBeTruthy());
  });

  it("加载中时显示骨架屏", () => {
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));
    render(<ModalComments targetType="article" targetId={1} />);
    expect(screen.getByTestId("comment-list-skeleton")).toBeTruthy();
  });

  it("hasMore 时显示「查看更多评论」按钮", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)], 3)));

    render(<ModalComments targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("查看更多评论")).toBeTruthy());
  });

  it("弹窗评论支持编辑待审版本并显示审核提示", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(
        mockPage([
          makeComment(1, {
            content: "公开旧正文",
            moderation: {
              public_state: "visible",
              display_version: "last_approved",
              has_pending_revision: true,
              pending_risk_level: "medium",
              pending_content: "待审新正文",
              can_interact: true,
            },
          }),
        ]),
      ),
    );

    render(<ModalComments targetType="article" targetId={1} />);
    await user.click(await screen.findByRole("button", { name: "编辑评论" }));

    expect(screen.getByDisplayValue("待审新正文")).toBeTruthy();
    expect(screen.getByText("编辑中 · 内容正在审核")).toBeTruthy();
  });

  it("无更多时不显示「查看更多评论」", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)], 1)));

    render(<ModalComments targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
    expect(screen.queryByText("查看更多评论")).toBeNull();
  });

  it("点击评论「回复」后顶部按钮切换为「取消回复」并联动底部 pill banner，再次点击取消", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)])));

    render(<ModalComments targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "回复" }));
    expect(screen.queryByRole("button", { name: "回复" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "取消回复" }).length).toBeGreaterThan(0);
    expect(screen.getByText("@Alice")).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: "取消回复" })[0]!);
    expect(screen.getByRole("button", { name: "回复" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "取消回复" })).toBeNull();
    expect(screen.queryByText("@Alice")).toBeNull();
  });

  it("点击自己评论的「编辑评论」后顶部按钮切换为「取消编辑」并联动底部 pill，再次点击取消", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)])));

    render(<ModalComments targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "编辑评论" }));
    expect(screen.queryByRole("button", { name: "编辑评论" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "取消编辑" }).length).toBeGreaterThan(0);
    // PillCommentInput 在编辑态进入 focus 不展示 banner 文案，但 textarea 进入编辑态
    expect(screen.getByPlaceholderText("编辑内容...")).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: "取消编辑" })[0]!);
    expect(screen.getByRole("button", { name: "编辑评论" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "取消编辑" })).toBeNull();
    expect(screen.queryByPlaceholderText("编辑内容...")).toBeNull();
  });

  it("滚动区域尺寸变化时触发 onContentResize", async () => {
    const onContentResize = vi.fn();
    const callbacks: Array<ResizeObserverCallback> = [];

    class MockResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb);
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }

    const originalRO = window.ResizeObserver;
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    render(<ModalComments targetType="article" targetId={1} onContentResize={onContentResize} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());

    // useLayoutEffect 在加载完成后会触发一次
    expect(onContentResize).toHaveBeenCalled();

    const callCountBefore = onContentResize.mock.calls.length;

    // 模拟 ResizeObserver 尺寸变化回调（如展开回复导致高度增加）
    if (callbacks.length > 0) {
      callbacks[0]([], new MockResizeObserver(vi.fn()) as unknown as ResizeObserver);
      expect(onContentResize.mock.calls.length).toBeGreaterThan(callCountBefore);
    }

    window.ResizeObserver = originalRO;
  });
});
