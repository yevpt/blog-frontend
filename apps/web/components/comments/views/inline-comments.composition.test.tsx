// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InlineComments } from "./inline-comments";

// 受控的 hook 返回值，单测仅断言 inline 视图对 submitError / replyTarget 的组合渲染，
// 不驱动真实提交/回复流程，故直接 mock 状态 hook。
const hookState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock("../hooks/use-comment-section-state", () => ({
  useCommentSectionState: () => hookState.value,
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
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

vi.mock("../parts/comment-list", () => ({
  CommentList: () => <div data-testid="comment-list" />,
}));

/** 构造 hook 默认返回值，按需覆盖个别字段。 */
function makeHookState(overrides?: Record<string, unknown>) {
  return {
    userId: 1,
    comments: [],
    isLoading: false,
    hasMore: false,
    error: null,
    loadMore: vi.fn(),
    replyTarget: null,
    content: "",
    setContent: vi.fn(),
    pendingReplies: {},
    isSubmitting: false,
    submitError: null,
    handleReply: vi.fn(),
    handleCancelReply: vi.fn(),
    handleSubmit: vi.fn(),
    handleCommentLike: vi.fn(),
    handleChange: vi.fn(),
    ...overrides,
  };
}

describe("InlineComments 组合渲染", () => {
  it("submitError 存在时渲染错误提示", () => {
    hookState.value = makeHookState({ submitError: "提交失败" });
    render(<InlineComments targetType="article" targetId={1} />);

    const error = screen.getByText("提交失败");
    expect(error).toBeTruthy();
    expect(error.className).toContain("text-red-500");
  });

  it("无 submitError / replyTarget 时不渲染错误提示与回复条", () => {
    hookState.value = makeHookState();
    render(<InlineComments targetType="article" targetId={1} />);

    expect(screen.queryByText("提交失败")).toBeNull();
    expect(screen.queryByText("正在回复")).toBeNull();
    expect(screen.getByTestId("rich-comment-input")).toBeTruthy();
  });

  it("replyTarget 存在时渲染 ReplyBanner 并展示 @用户名", () => {
    hookState.value = makeHookState({
      replyTarget: { commentId: 1, toUsername: "bob" },
    });
    render(<InlineComments targetType="article" targetId={1} />);

    expect(screen.getByText("正在回复")).toBeTruthy();
    expect(screen.getByText("@bob")).toBeTruthy();
  });
});
