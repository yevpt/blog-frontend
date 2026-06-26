import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WriteMomentButton } from "./write-moment-button";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useMomentModal } from "@/store/use-moment-modal";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: vi.fn(),
}));

vi.mock("@/store/use-moment-modal", () => ({
  useMomentModal: vi.fn(),
}));

describe("WriteMomentButton", () => {
  const mockOpenLoginModal = vi.fn();
  const mockOpenMomentModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoginModal).mockReturnValue({
      open: mockOpenLoginModal,
      close: vi.fn(),
      isOpen: false,
    });
    vi.mocked(useMomentModal).mockReturnValue({
      open: mockOpenMomentModal,
      close: vi.fn(),
      isOpen: false,
    });
  });

  it("渲染按钮不崩溃", () => {
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null, patchProfile: () => {} });
    render(<WriteMomentButton />);
    expect(screen.getByRole("button", { name: "写碎语" })).toBeInTheDocument();
  });

  it("圆形按钮去除默认内边距，避免图标被挤压", () => {
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null, patchProfile: () => {} });
    render(<WriteMomentButton />);
    const button = screen.getByRole("button", { name: "写碎语" });
    expect(button.className).toContain("p-0");
    const icon = button.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("size-4");
    expect(icon?.getAttribute("class")).toContain("md:size-[18px]");
  });

  it("float 变体使用低调主体色毛玻璃样式", () => {
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null, patchProfile: () => {} });
    render(<WriteMomentButton variant="float" />);
    const button = screen.getByRole("button", { name: "写碎语" });
    expect(button.className).toContain("backdrop-blur-xl");
    expect(button.className).toContain("bg-primary/12");
    expect(button.className).toContain("ring-primary/25");
    expect(button.className).toContain("text-primary");
    expect(button.className).not.toContain("bg-primary ");
  });

  it("未登录时点击弹出登录弹窗", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null, patchProfile: () => {} });
    render(<WriteMomentButton />);

    await user.click(screen.getByRole("button", { name: "写碎语" }));
    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(mockOpenMomentModal).not.toHaveBeenCalled();
  });

  it("已登录时点击弹出写碎语弹窗", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({
      userId: 1,
      profile: { id: 1, username: "test", nickname: "Test", status: 0, roles: ["user"] },
      patchProfile: () => {},
    });
    render(<WriteMomentButton />);

    await user.click(screen.getByRole("button", { name: "写碎语" }));
    expect(mockOpenMomentModal).toHaveBeenCalledOnce();
    expect(mockOpenLoginModal).not.toHaveBeenCalled();
  });
});
