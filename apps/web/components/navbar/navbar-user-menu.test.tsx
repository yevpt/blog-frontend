import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserDetailResp } from "@repo/api";
import { NavbarUserMenu } from "./navbar-user-menu";

const mockOpenAdminPanel = vi.fn();
vi.mock("./admin-panel", () => ({
  openAdminPanel: () => mockOpenAdminPanel(),
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockOpenMomentModal = vi.fn();
vi.mock("@/store/use-moment-modal", () => ({
  useMomentModal: () => ({ open: mockOpenMomentModal }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ src, name }: { src?: string; name: string }) =>
    src ? (
      <img data-testid="user-avatar-img" src={src} alt={name} />
    ) : (
      <span data-testid="user-avatar-fallback">{name[0]?.toUpperCase() ?? "?"}</span>
    ),
}));

const mockUseSession = vi.fn();
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => mockUseSession(),
}));

let mobileMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

function makeProfile(overrides: Partial<UserDetailResp> = {}): UserDetailResp {
  return {
    id: 1,
    username: "testuser",
    roles: [],
    status: 1,
    ...overrides,
  };
}

describe("NavbarUserMenu", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockOpenMomentModal.mockClear();
    mockOpenAdminPanel.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
    mobileMediaListener = null;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
          if (event === "change" && query === "(max-width: 767px)") {
            mobileMediaListener = listener;
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    mockUseSession.mockReturnValue({ userId: 1, profile: makeProfile() });
  });

  it("渲染头像按钮，aria-label 包含账号菜单文字", () => {
    render(<NavbarUserMenu />);
    expect(screen.getByRole("button", { name: /账号菜单/ })).toBeInTheDocument();
  });

  it("头像触发按钮含 cursor-pointer 样式", () => {
    render(<NavbarUserMenu />);
    expect(screen.getByRole("button", { name: /账号菜单/ }).className).toContain("cursor-pointer");
  });

  it("头像触发按钮不使用 ghost 的悬浮背景", () => {
    render(<NavbarUserMenu />);
    const trigger = screen.getByRole("button", { name: /账号菜单/ });
    expect(trigger.className).not.toContain("hover:bg-accent");
    expect(trigger.className).toContain("hover:bg-transparent");
  });

  it("初始状态下拉菜单不可见", () => {
    render(<NavbarUserMenu />);
    expect(screen.queryByText("管理账号", { exact: false })).not.toBeInTheDocument();
  });

  it("点击头像展开下拉，显示昵称行、功能项、退出登录", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("管理账号", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("发表碎语")).toBeInTheDocument();
    expect(screen.getByText("我的消息")).toBeInTheDocument();
    expect(screen.queryByText("管理后台")).not.toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("管理员展开下拉时显示管理后台入口", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ roles: ["ROLE_ADMIN"] }),
    });
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("管理后台")).toBeInTheDocument();
  });

  it("下拉菜单内部按钮不继承 Button 默认 ghost 布局和悬浮背景", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));

    const profileButton = screen.getByText("管理账号", { exact: false }).closest("button");
    const momentButton = screen.getByText("发表碎语").closest("button");
    const messagesButton = screen.getByText("我的消息").closest("button");
    const logoutButton = screen.getByText("退出登录").closest("button");

    for (const button of [profileButton, momentButton, messagesButton, logoutButton]) {
      expect(button).toBeTruthy();
      expect(button?.className).not.toContain("hover:bg-accent");
      expect(button?.className).not.toContain("h-10");
      expect(button?.className).not.toContain("px-4");
      expect(button?.className).not.toContain("justify-center");
    }

    expect(profileButton?.className).toContain("justify-between");
    expect(momentButton?.className).toContain("justify-start");
    expect(messagesButton?.className).toContain("justify-start");
    expect(logoutButton?.className).toContain("justify-start");
  });

  it("下拉展开后不显示邮箱", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ email: "alice@example.com" }),
    });
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
  });

  it("点击容器外部关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("发表碎语")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击昵称行跳转用户详情页并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("管理账号", { exact: false }));
    expect(mockPush).toHaveBeenCalledWith("/users/1");
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击「发表碎语」调用 openMomentModal 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("发表碎语"));
    expect(mockOpenMomentModal).toHaveBeenCalledOnce();
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击「我的消息」跳转 /messages 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("我的消息"));
    expect(mockPush).toHaveBeenCalledWith("/notifications");
    expect(screen.queryByText("我的消息")).not.toBeInTheDocument();
  });

  it("点击「管理后台」在新标签打开管理后台并关闭下拉", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ roles: ["ROLE_ADMIN"] }),
    });
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("管理后台"));
    expect(mockOpenAdminPanel).toHaveBeenCalledOnce();
    expect(screen.queryByText("管理后台")).not.toBeInTheDocument();
  });

  it("点击「退出登录」调用 /api/auth/logout 并 refresh 页面", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("退出登录"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
  });

  // ── unreadCount 徽标 ────────────────────────────────────────────

  it("unreadCount 为 0 时不显示徽标", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu unreadCount={0} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument();
  });

  it("unreadCount 为 10 时显示数字 10", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu unreadCount={10} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("10");
  });

  it("unreadCount 大于 0 时头像触发按钮显示红点", () => {
    render(<NavbarUserMenu unreadCount={1} />);
    expect(screen.getByTestId("avatar-unread-dot")).toBeInTheDocument();
  });

  it("unreadCount 为 0 时头像触发按钮不显示红点", () => {
    render(<NavbarUserMenu unreadCount={0} />);
    expect(screen.queryByTestId("avatar-unread-dot")).not.toBeInTheDocument();
  });

  it("unreadCount 超过 99 时显示 99+", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu unreadCount={100} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("99+");
  });

  // ── profile 场景 ────────────────────────────────────────────────

  it("profile.avatar_url 有值时渲染 <img> 头像", () => {
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ avatar_url: "https://example.com/avatar.png" }),
    });
    render(<NavbarUserMenu />);
    expect(screen.getByTestId("user-avatar-img")).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );
  });

  it("profile 无 avatar_url 时渲染首字母 fallback", () => {
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ username: "alice" }),
    });
    render(<NavbarUserMenu />);
    expect(screen.getByTestId("user-avatar-fallback").textContent).toBe("A");
  });

  it("profile 为 null 时不崩溃，显示 ? fallback", () => {
    mockUseSession.mockReturnValue({ userId: 1, profile: null });
    render(<NavbarUserMenu />);
    expect(screen.getByTestId("user-avatar-fallback").textContent).toBe("?");
  });

  it("下拉展开时显示 nickname（优先于 username）", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ username: "alice", nickname: "爱丽丝" }),
    });
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("爱丽丝")).toBeInTheDocument();
  });

  it("下拉展开后切换到移动端断点时自动关闭 portal 菜单", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("发表碎语")).toBeInTheDocument();

    act(() => {
      mobileMediaListener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });
});
