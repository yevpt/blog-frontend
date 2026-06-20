// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookInputBar } from "./guestbook-input-bar";

const mockOpenLoginModal = vi.fn();
const mockUseSession = vi.fn(() => ({ userId: 1 as number | null }));
const mockUseLoginModal = vi.fn(() => ({ open: mockOpenLoginModal }));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => mockUseLoginModal(),
}));

vi.mock("@/components/comments", () => ({
  RichCommentInput: ({
    onSubmit,
    placeholder,
    header,
  }: {
    onSubmit: () => void;
    placeholder?: string;
    header?: React.ReactNode;
  }) => (
    <div data-testid="rich-input">
      {header && <div data-testid="reply-banner">{header}</div>}
      <span data-testid="placeholder">{placeholder}</span>
      <button onClick={onSubmit}>发布</button>
    </div>
  ),
}));

describe("GuestbookInputBar", () => {
  it("渲染 RichCommentInput", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    expect(screen.getByTestId("rich-input")).toBeTruthy();
  });

  it("默认 placeholder 为留言提示", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    expect(screen.getByTestId("placeholder").textContent).toContain("说点什么");
  });

  it("replyTarget 传入时 placeholder 包含回复对象名", () => {
    render(
      <GuestbookInputBar onSubmit={vi.fn()} replyTarget={{ commentId: 1, toUsername: "Alice" }} />,
    );
    expect(screen.getByTestId("placeholder").textContent).toContain("Alice");
  });

  it("replyTarget 传入时通过 header 显示回复指示条（包含用户名）", () => {
    render(
      <GuestbookInputBar onSubmit={vi.fn()} replyTarget={{ commentId: 1, toUsername: "Alice" }} />,
    );
    expect(screen.getByTestId("reply-banner")).toBeTruthy();
    expect(screen.getByText("@Alice")).toBeTruthy();
  });

  it("点击取消按钮调用 onCancelReply", async () => {
    const onCancelReply = vi.fn();
    render(
      <GuestbookInputBar
        onSubmit={vi.fn()}
        replyTarget={{ commentId: 1, toUsername: "Alice" }}
        onCancelReply={onCancelReply}
      />,
    );
    await userEvent.click(screen.getByText("×"));
    expect(onCancelReply).toHaveBeenCalled();
  });

  it("submitError 显示错误信息", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} submitError="提交失败" />);
    expect(screen.getByText("提交失败")).toBeTruthy();
  });
});
