import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarMobileMenu } from "./navbar-mobile-menu";
import { useSession } from "@/app/providers/session-provider";
import type { AnchorHTMLAttributes } from "react";

let mockResolvedTheme: "light" | "dark" = "light";

vi.mock("../../app/providers/theme-provider", () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme, setTheme: vi.fn() }),
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
  useSession: vi.fn(() => ({ userId: null })),
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => (
    <span data-testid="user-avatar">{name[0]?.toUpperCase()}</span>
  ),
}));

const mockOnClose = vi.fn();

describe("NavbarMobileMenu", () => {
  beforeEach(() => {
    mockResolvedTheme = "light";
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null, patchProfile: () => {} });
    mockRefresh.mockClear();
    mockOnClose.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
  });

  it("未登录：显示登录按钮，不显示头像", () => {
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByText("登录")).toBeInTheDocument();
    expect(screen.getByText("欢迎回来")).toBeInTheDocument();
    expect(screen.getByText("登录后可查看消息与个人主页")).toBeInTheDocument();
    expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
  });

  it("未登录：底部主题切换行渲染，显示「浅色模式」文字", () => {
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    const themeBtn = screen.getByRole("button", {
      name: "当前生效主题：light，点击切换到 dark",
    });
    expect(themeBtn).toBeInTheDocument();
    expect(themeBtn).toHaveTextContent("浅色模式");
  });

  it("深色主题下底部切换行显示「深色模式」", () => {
    mockResolvedTheme = "dark";
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    const themeBtn = screen.getByRole("button", {
      name: "当前生效主题：dark，点击切换到 light",
    });
    expect(themeBtn).toBeInTheDocument();
    expect(themeBtn).toHaveTextContent("深色模式");
  });

  it("已登录：显示用户区域和头像，不显示登录提示", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.textContent?.includes("主页") && link.getAttribute("href") === "/"),
    ).toBe(true);
    expect(screen.queryByText("登录")).not.toBeInTheDocument();
    expect(screen.queryByText("欢迎回来")).not.toBeInTheDocument();
  });

  it("按主页、碎语、留言、友邻、圈子的顺序渲染移动导航", () => {
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    const navLinks = screen
      .getAllByRole("link")
      .filter((link) =>
        ["/", "/moments", "/guestbook", "/friend-links", "/circle"].includes(
          link.getAttribute("href") ?? "",
        ),
      );

    expect(navLinks.map((link) => link.textContent?.replace(/›/g, "").trim())).toEqual([
      "主页",
      "碎语",
      "留言",
      "友邻",
      "圈子",
    ]);
  });

  it("已登录：点击退出登录调用 /api/auth/logout 并 refresh 和 onClose", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    await user.click(screen.getByLabelText("退出登录"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("已登录：主题切换按钮有 cursor-pointer 样式", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    const themeBtn = screen.getByRole("button", {
      name: "当前生效主题：light，点击切换到 dark",
    });
    expect(themeBtn.className).toContain("cursor-pointer");
  });

  it("已登录：退出按钮在用户卡片区，aria-label 为「退出登录」", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    const logoutBtn = screen.getByRole("button", { name: "退出登录" });
    expect(logoutBtn).toBeInTheDocument();
    // 退出按钮不在底部三列网格中，不含独立的 bg-destructive 背景类
    expect(logoutBtn.className).not.toMatch(/(?:^|\s)bg-destructive(?:[\s/]|$)/);
    expect(logoutBtn.className).toContain("dark:text-foreground/[0.45]");
  });

  it("已登录：unreadCount 未传时不渲染徽标", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.queryByText(/^\d+$|^99\+$/)).not.toBeInTheDocument();
  });

  it("已登录：unreadCount=5 时消息行渲染 '5'", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} unreadCount={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("已登录：unreadCount=100 时消息行渲染 '99+'", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} unreadCount={100} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("已登录：主题行含 amber 图标（icon-sun 或 icon-moon）", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null, patchProfile: () => {} });
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    // 浅色模式下显示 sun 图标（表示可切换到 dark）
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
  });

  it("未登录：主题行含 amber 图标（icon-sun）", () => {
    render(<NavbarMobileMenu isOpen onClose={mockOnClose} />);
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
  });
});
