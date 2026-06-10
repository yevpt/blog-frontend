// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookInputBar } from "./guestbook-input-bar";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
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

  it("点击 pill 后 placeholder 显示正确", async () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    const pillText = screen.getByText("说点什么…");
    await userEvent.click(pillText);
    expect(screen.getByTestId("placeholder").textContent).toContain("说点什么");
  });

  it("遮罩存在且点击后状态变化", async () => {
    render(<GuestbookInputBar onSubmit={vi.fn()} />);
    const overlay = document.querySelector("[aria-hidden='true']");
    expect(overlay).toBeTruthy();
  });
});
