// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
    value,
    onChange,
    onSubmit,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    placeholder?: string;
  }) => (
    <div data-testid="rich-input">
      <span data-testid="input-value">{value}</span>
      <span data-testid="placeholder">{placeholder}</span>
      <textarea
        data-testid="rich-input-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button onClick={onSubmit}>发布</button>
    </div>
  ),
}));

describe("GuestbookInputBar", () => {
  it("渲染 RichCommentInput", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    expect(screen.getByTestId("rich-input")).toBeTruthy();
  });

  it("placeholder 为留言提示", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    expect(screen.getByTestId("placeholder").textContent).toContain("说点什么");
  });

  it("点击发布调用 onSubmit 并在成功后清空内容", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<GuestbookInputBar onSubmit={onSubmit} />);

    // handleSubmit 有 `!content.trim()` 空内容拦截，必须先真正输入内容再点击发布，
    // 否则无论实现对错这个用例都会因为守卫拦截而通不过。
    await user.type(screen.getByTestId("rich-input-textarea"), "留言内容");
    await user.click(screen.getByText("发布"));

    expect(onSubmit).toHaveBeenCalledWith("留言内容");
    await waitFor(() => expect(screen.getByTestId("input-value").textContent).toBe(""));
  });
});
