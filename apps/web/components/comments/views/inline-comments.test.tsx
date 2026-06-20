// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { InlineComments } from "./inline-comments";

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
vi.mock("../inputs/rich-comment-input", () => ({
  RichCommentInput: () => <div data-testid="rich-comment-input" />,
}));
vi.mock("../parts/comment-replies", () => ({
  CommentReplies: () => null,
}));
vi.mock("../parts/comment-item", () => ({
  CommentItem: ({ comment }: { comment: CommentItemResp }) => (
    <div data-testid="comment-item" data-comment-id={comment.id}>
      {comment.content}
    </div>
  ),
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

describe("InlineComments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(mockPage([makeComment(1), makeComment(2)])));
  });

  it("评论列表渲染", async () => {
    render(<InlineComments targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
  });
});
