import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => (
    <span data-testid="user-avatar">{name[0]?.toUpperCase()}</span>
  ),
}));

describe("NavbarUserMenu", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockOpenSnippetModal.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
  });

  it("渲染头像按钮，aria-label 包含账号菜单文字", () => {
    render(<NavbarUserMenu userId={1} />);
    expect(screen.getByRole("button", { name: /账号菜单/ })).toBeInTheDocument();
  });

  it("初始状态下拉菜单不可见", () => {
    render(<NavbarUserMenu userId={1} />);
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击头像按钮展开下拉，显示所有菜单项", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu userId={1} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("我的账号")).toBeInTheDocument();
    expect(screen.getByText("发表碎语")).toBeInTheDocument();
    expect(screen.getByText("消息")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("点击容器外部关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu userId={1} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    expect(screen.getByText("我的账号")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击「我的账号」跳转 /profile 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu userId={1} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("我的账号"));
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(screen.queryByText("我的账号")).not.toBeInTheDocument();
  });

  it("点击「发表碎语」调用 openSnippetModal 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu userId={1} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("发表碎语"));
    expect(mockOpenSnippetModal).toHaveBeenCalledOnce();
    expect(screen.queryByText("发表碎语")).not.toBeInTheDocument();
  });

  it("点击「消息」跳转 /messages 并关闭下拉", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu userId={1} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("消息"));
    expect(mockPush).toHaveBeenCalledWith("/messages");
    expect(screen.queryByText("消息")).not.toBeInTheDocument();
  });

  it("点击「退出登录」调用 /api/auth/logout 并 refresh 页面", async () => {
    const user = userEvent.setup();
    render(<NavbarUserMenu userId={1} />);
    await user.click(screen.getByRole("button", { name: /账号菜单/ }));
    await user.click(screen.getByText("退出登录"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
  });
});
