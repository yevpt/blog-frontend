import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserDetailResp } from "@repo/api";
import { NavbarUserMenu } from "./navbar-user-menu";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockOpenSnippetModal = vi.fn();
vi.mock("@/store/use-snippet-modal", () => ({
  useSnippetModal: () => ({ open: mockOpenSnippetModal }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// 真实 UserAvatar 行为：有 src 渲染 <img>，无 src 渲染首字母 fallback
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

/** 构造最小化 profile 对象 */
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
    mockOpenSnippetModal.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
    // 默认：已登录，无头像，无 nickname
    mockUseSession.mockReturnValue({ userId: 1, profile: makeProfile() });
  });

  it("渲染头像按钮，aria-label 包含账号菜单文字", () => {
    render(<NavbarUserMenu />);
    expect(screen.getByRole("button", { name: /账号菜单/ })).toBeInTheDocument();
  });

  it("初始状态下拉菜单不可见", () => {
    render(<NavbarUserMenu />);
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击头像按钮展开下拉，显示所有菜单项", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("我的账号")).toBeInTheDocument();
    expect(screen.getByText("发表碎语")).toBeInTheDocument();
    expect(screen.getByText("消息")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("点击容器外部关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("我的账号")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击「我的账号」跳转 /profile 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("我的账号"));
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击「发表碎语」调用 openSnippetModal 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("发表碎语"));
    expect(mockOpenSnippetModal).toHaveBeenCalledOnce();
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击「消息」跳转 /messages 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("消息"));
    expect(mockPush).toHaveBeenCalledWith("/messages");
    expect(screen.queryByText("消息")).not.toBeInTheDocument();
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

  // ── profile 接入场景 ────────────────────────────────────────────

  it("profile.avatar_url 有值时渲染 <img> 头像", () => {
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ avatar_url: "https://example.com/avatar.png" }),
    });
    render(<NavbarUserMenu />);
    expect(screen.getByTestId("user-avatar-img")).toBeInTheDocument();
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
    expect(screen.getByTestId("user-avatar-fallback")).toBeInTheDocument();
    // 首字母大写
    expect(screen.getByTestId("user-avatar-fallback").textContent).toBe("A");
  });

  it("profile 为 null 时不崩溃，显示 ? fallback", () => {
    mockUseSession.mockReturnValue({ userId: 1, profile: null });
    render(<NavbarUserMenu />);
    expect(screen.getByTestId("user-avatar-fallback")).toBeInTheDocument();
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
    // 用户信息头显示 nickname
    expect(screen.getByText("爱丽丝")).toBeInTheDocument();
  });

  it("下拉展开时显示 email（若有）", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ email: "alice@example.com" }),
    });
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("profile 无 email 时不渲染 email 元素", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      userId: 1,
      profile: makeProfile({ email: undefined }),
    });
    render(<NavbarUserMenu />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});
