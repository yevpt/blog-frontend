import { describe, it, expect, vi } from "vitest";
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

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

describe("CommentInput（已登录）", () => {
  it("渲染文本框和发布按钮", () => {
    render(<CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByPlaceholderText("写下你的评论...")).toBeTruthy();
    expect(screen.getByText("发布")).toBeTruthy();
  });

  it("value 为空时发布按钮禁用", () => {
    render(<CommentInput value="" onChange={vi.fn()} onSubmit={vi.fn()} />);

    const button = screen.getByText("发布").closest("button");
    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(true);
  });

  it("value 非空时发布按钮可用，点击触发 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentInput value="有内容" onChange={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByText("发布"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("回复模式下显示 @用户名 和取消按钮", () => {
    render(
      <CommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={vi.fn()}
      />,
    );

    expect(screen.getByText("@Alice")).toBeTruthy();
    expect(screen.getByText("取消")).toBeTruthy();
  });

  it("点击取消回复触发 onCancelReply", async () => {
    const user = userEvent.setup();
    const onCancelReply = vi.fn();
    render(
      <CommentInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={onCancelReply}
      />,
    );

    await user.click(screen.getByText("取消"));

    expect(onCancelReply).toHaveBeenCalledTimes(1);
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
});
