import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarMobileMenu } from "./navbar-mobile-menu";
import { useSession } from "@/app/providers/session-provider";
import type { AnchorHTMLAttributes } from "react";

vi.mock("../../app/providers/theme-provider", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({ t: (key: string) => (key === "auth.login" ? "登录" : key) }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ user: null })),
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => (
    <span data-testid="user-avatar">{name[0]?.toUpperCase()}</span>
  ),
}));

const mockOnClose = vi.fn();

describe("NavbarMobileMenu", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ user: null });
    mockRefresh.mockClear();
    mockOnClose.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
  });

  it("未登录：显示登录按钮，不显示头像", () => {
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByText("登录")).toBeInTheDocument();
    expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
  });

  it("已登录：显示用户昵称和头像，不显示登录按钮", () => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 1, username: "alice", nickname: "小A" },
    });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByText("小A")).toBeInTheDocument();
    expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
    expect(screen.queryByText("登录")).not.toBeInTheDocument();
  });

  it("已登录：无昵称时显示 username", () => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 2, username: "bob" },
    });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("已登录：点击退出登录调用 /api/auth/logout 并 refresh 和 onClose", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({
      user: { id: 1, username: "alice", nickname: "小A" },
    });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    await user.click(screen.getByLabelText("退出登录"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
    expect(mockOnClose).toHaveBeenCalledOnce();
  });
});
