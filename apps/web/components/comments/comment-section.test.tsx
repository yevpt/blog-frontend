// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { CommentSection } from "./comment-section";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));
vi.mock("@repo/ui", () => ({
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
  Select: Object.assign(
    ({
      children,
      "aria-label": ariaLabel,
    }: {
      children: React.ReactNode;
      "aria-label"?: string;
    }) => (
      <div role="listbox" aria-label={ariaLabel}>
        {children}
      </div>
    ),
    {
      Item: ({ id, label }: { id: string; label: string }) => (
        <div role="option" aria-selected="false" data-select-id={id}>
          {label}
        </div>
      ),
    },
  ),
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
vi.mock("./parts/comment-replies", () => ({
  CommentReplies: () => null,
}));
vi.mock("./parts/comment-item", () => ({
  CommentItem: ({ comment }: { comment: CommentItemResp }) => (
    <div data-testid="comment-item" data-comment-id={comment.id}>
      {comment.content}
    </div>
  ),
}));
vi.mock("./parts/comment-skeleton", () => ({
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

describe("CommentSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(mockPage([makeComment(1), makeComment(2)])));
  });

  it("modal layout：加载并渲染评论列表", async () => {
    render(<CommentSection targetType="article" targetId={1} layout="modal" />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
    expect(screen.getByText("评论内容 2")).toBeTruthy();
  });

  it("inline layout：评论列表仍然渲染", async () => {
    render(<CommentSection targetType="article" targetId={1} layout="inline" />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
  });

  it("moment targetType 正常工作", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(mockPage([makeComment(1, { target_type: "moment" })])),
    );
    render(<CommentSection targetType="moment" targetId={5} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
  });

  it("暂无评论时显示提示文案", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([])));
    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText(/暂无评论/)).toBeTruthy());
  });

  it("加载中时显示骨架屏", () => {
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));
    render(<CommentSection targetType="article" targetId={1} />);
    expect(screen.getByTestId("comment-list-skeleton")).toBeTruthy();
  });

  it("hasMore 时显示「查看更多评论」按钮", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)], 3)));

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("查看更多评论")).toBeTruthy());
  });

  it("无更多时不显示「查看更多评论」", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeComment(1)], 1)));

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
    expect(screen.queryByText("查看更多评论")).toBeNull();
  });

  it("modal layout：滚动区域尺寸变化时触发 onContentResize", async () => {
    const onContentResize = vi.fn();
    // eslint-disable-next-line no-undef -- TS global type not a runtime var
    const callbacks: Array<ResizeObserverCallback> = [];

    class MockResizeObserver {
      // eslint-disable-next-line no-undef -- TS global type not a runtime var
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb);
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }

    const originalRO = window.ResizeObserver;
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    render(
      <CommentSection
        targetType="article"
        targetId={1}
        layout="modal"
        onContentResize={onContentResize}
      />,
    );
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
