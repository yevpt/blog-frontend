import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WriteSnippetButton } from "./write-snippet-button";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useSnippetModal } from "@/store/use-snippet-modal";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: vi.fn(),
}));

vi.mock("@/store/use-snippet-modal", () => ({
  useSnippetModal: vi.fn(),
}));

describe("WriteSnippetButton", () => {
  const mockOpenLoginModal = vi.fn();
  const mockOpenSnippetModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoginModal).mockReturnValue({
      open: mockOpenLoginModal,
      close: vi.fn(),
      isOpen: false,
    });
    vi.mocked(useSnippetModal).mockReturnValue({
      open: mockOpenSnippetModal,
      close: vi.fn(),
      isOpen: false,
    });
  });

  it("渲染按钮不崩溃", () => {
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null, patchProfile: () => {} });
    render(<WriteSnippetButton />);
    expect(screen.getByRole("button", { name: "写碎语" })).toBeInTheDocument();
  });

  it("未登录时点击弹出登录弹窗", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null, patchProfile: () => {} });
    render(<WriteSnippetButton />);

    await user.click(screen.getByRole("button", { name: "写碎语" }));
    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(mockOpenSnippetModal).not.toHaveBeenCalled();
  });

  it("已登录时点击弹出写碎语弹窗", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({
      userId: 1,
      profile: { id: 1, username: "test", nickname: "Test", status: 0, roles: ["user"] },
      patchProfile: () => {},
    });
    render(<WriteSnippetButton />);

    await user.click(screen.getByRole("button", { name: "写碎语" }));
    expect(mockOpenSnippetModal).toHaveBeenCalledOnce();
    expect(mockOpenLoginModal).not.toHaveBeenCalled();
  });
});
