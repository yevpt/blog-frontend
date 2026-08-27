import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminUserDetailResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { UserDetailModal } from "./UserDetailModal";

// React Aria Tabs 的共享元素过渡依赖 Web Animations API，happy-dom 未实现。
beforeAll(() => {
  if (!HTMLElement.prototype.getAnimations) {
    HTMLElement.prototype.getAnimations = () => [];
  }
});

vi.mock("../../../lib/api", () => ({
  apiClient: {
    users: {
      getAdminDetail: vi.fn(),
      grantVipRole: vi.fn(),
      revokeVipRole: vi.fn(),
      disableAccount: vi.fn(),
      enableAccount: vi.fn(),
    },
  },
}));

const detail: AdminUserDetailResp = {
  id: 7,
  username: "vpt",
  nickname: "VPT",
  email: "vpt@example.com",
  email_verified: true,
  password_set: true,
  roles: ["ROLE_NORMAL"],
  register_at: "2026-01-01T00:00:00Z",
  is_online: false,
  sanction_state: "active",
  status: 1,
};

describe("UserDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.users.getAdminDetail).mockResolvedValue(detail);
    vi.mocked(apiClient.users.grantVipRole).mockResolvedValue({
      user_id: 7,
      roles: ["ROLE_NORMAL", "ROLE_VIP"],
    });
    vi.mocked(apiClient.users.disableAccount).mockResolvedValue(undefined);
  });

  it("userId 为 null 时不渲染弹层", () => {
    render(<UserDetailModal userId={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("加载成功后显示基本信息", async () => {
    render(<UserDetailModal userId={7} onClose={vi.fn()} />);
    expect(await screen.findByText("用户名")).toBeInTheDocument();
    expect(screen.getAllByText("vpt").length).toBeGreaterThan(0);
    expect(screen.getByText("vpt@example.com")).toBeInTheDocument();
    expect(screen.getByText("已验证")).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "用户详情页签" })).toHaveClass("border-b");
    expect(screen.getByText("用户档案 · #7")).toBeInTheDocument();
    expect(screen.getByText("VPT").closest("header")).toHaveClass("sm:px-6", "bg-card/95");
  });

  it("可从页头关闭详情", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<UserDetailModal userId={7} onClose={onClose} />);

    await user.click(await screen.findByRole("button", { name: "关闭用户详情" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("可授予 VIP 并通知列表刷新", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<UserDetailModal userId={7} onClose={vi.fn()} onChanged={onChanged} />);

    await user.click(await screen.findByRole("tab", { name: "角色与账号" }));
    await user.click(screen.getByRole("button", { name: "授予 VIP" }));

    await waitFor(() => expect(apiClient.users.grantVipRole).toHaveBeenCalledWith(7));
    expect(onChanged).toHaveBeenCalled();
  });

  it("可禁用账号", async () => {
    const user = userEvent.setup();
    render(<UserDetailModal userId={7} onClose={vi.fn()} />);

    await user.click(await screen.findByRole("tab", { name: "角色与账号" }));
    await user.click(screen.getByRole("button", { name: "禁用账号" }));

    await waitFor(() => expect(apiClient.users.disableAccount).toHaveBeenCalledWith(7));
  });

  it("提供内容治理页签", async () => {
    render(<UserDetailModal userId={7} onClose={vi.fn()} />);
    expect(await screen.findByRole("tab", { name: "内容治理" })).toBeInTheDocument();
  });

  it("提供头像与操作日志页签", async () => {
    render(<UserDetailModal userId={7} onClose={vi.fn()} />);
    expect(await screen.findByRole("tab", { name: "头像" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "操作日志" })).toBeInTheDocument();
  });
});
