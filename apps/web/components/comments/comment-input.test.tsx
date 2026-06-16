// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { CommentInput } from "./comment-input";

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ userId: 1 })),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: (selector?: (s: { open: ReturnType<typeof vi.fn> }) => unknown) => {
    const store = { open: vi.fn() };
    return typeof selector === "function" ? selector(store) : store;
  },
}));

import { useSession } from "@/app/providers/session-provider";

describe("CommentInput（已登录）", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
  });

  it("渲染文本框", () => {
    render(<CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByPlaceholderText("写下你的评论...")).toBeTruthy();
  });

  it("value 为空时发送按钮不渲染", () => {
    render(<CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    // 设计要求：按钮仅在有内容时出现，空值时完全不渲染
    expect(screen.queryByTestId("icon-arrow-up")).toBeNull();
  });

  it("value 非空时发送按钮出现", () => {
    render(<CommentInput value="有内容" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByTestId("icon-arrow-up")).toBeTruthy();
  });

  it("value 非空时点击发送触发 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentInput value="有内容" onChange={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("icon-arrow-up").closest("button")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("回复模式下显示正在回复 @用户名 和取消按钮", () => {
    render(
      <CommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={vi.fn()}
      />,
    );

    expect(screen.getByText("正在回复")).toBeTruthy();
    expect(screen.getByText("@Alice")).toBeTruthy();
    expect(screen.getByText("取消")).toBeTruthy();
  });

  it("回复模式下 placeholder 变为「写下你的回复...」", () => {
    render(
      <CommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("写下你的回复...")).toBeTruthy();
  });

  it("submitError 非空时显示错误信息", () => {
    render(
      <CommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        submitError="发布失败，请稍后重试"
      />,
    );

    expect(screen.getByText("发布失败，请稍后重试")).toBeTruthy();
  });

  it("isSubmitting 时发送按钮禁用", () => {
    render(<CommentInput value="内容" onChange={vi.fn()} onSubmit={vi.fn()} isSubmitting />);

    const btn = screen.getByTestId("icon-arrow-up").closest("button");
    expect(btn?.disabled).toBe(true);
  });
});

describe("CommentInput（未登录）", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null });
  });

  it("未登录时显示登录提示 pill，不显示输入框", () => {
    render(<CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText("请先登录，参与评论")).toBeTruthy();
    expect(screen.queryByPlaceholderText("写下你的评论...")).toBeNull();
  });
});
