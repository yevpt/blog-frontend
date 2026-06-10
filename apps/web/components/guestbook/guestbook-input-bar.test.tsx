// @vitest-environment jsdom
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

vi.mock("@/components/comments/rich-comment-input", () => ({
  RichCommentInput: ({ onSubmit, placeholder }: { onSubmit: () => void; placeholder?: string }) => (
    <div data-testid="rich-input">
      <span data-testid="placeholder">{placeholder}</span>
      <button onClick={onSubmit}>发布</button>
    </div>
  ),
}));

describe("GuestbookInputBar", () => {
  it("默认渲染收起态 pill 文本", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    expect(screen.getByText("说点什么…")).toBeTruthy();
  });

  it("replyTarget 传入时显示回复对象名", () => {
    render(
      <GuestbookInputBar
        onSubmit={vi.fn()}
        replyTarget={{ guestbookId: 1, toUsername: "Alice" }}
      />,
    );
    // 因预挂载，pill 文字和 placeholder 均包含该文本，至少一个匹配即可
    expect(screen.getAllByText(/回复 @Alice/).length).toBeGreaterThan(0);
  });

  it("RichCommentInput 始终挂载（预挂载）", () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    // editor is pre-mounted (just hidden), not lazily rendered
    expect(screen.getByTestId("rich-input")).toBeTruthy();
  });

  it("replyTarget 传入时 RichCommentInput placeholder 包含回复对象名", () => {
    render(
      <GuestbookInputBar
        onSubmit={vi.fn()}
        replyTarget={{ guestbookId: 1, toUsername: "Alice" }}
      />,
    );
    // RichCommentInput is pre-mounted, placeholder is always passed
    expect(screen.getByTestId("placeholder").textContent).toContain("Alice");
  });

  it("遮罩存在且初始状态不可点击（pointer-events-none）", () => {
    const { container } = render(<GuestbookInputBar onSubmit={vi.fn()} />);
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay).toBeTruthy();
    expect(overlay?.className).toContain("pointer-events-none");
  });

  it("未登录时点击 pill 调用 openLoginModal", async () => {
    mockUseSession.mockReturnValueOnce({ userId: null });
    mockOpenLoginModal.mockClear();

    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    const pillButton = screen.getByRole("button", { name: /说点什么…/ });
    await userEvent.click(pillButton);
    expect(mockOpenLoginModal).toHaveBeenCalled();
  });
});
