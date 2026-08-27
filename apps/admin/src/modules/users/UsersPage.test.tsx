import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { UsersPage } from "./UsersPage";
import { useAdminUserList } from "./hooks/use-admin-user-list";
import type { UserRow } from "./model";

const mockRows: UserRow[] = [
  {
    id: "7",
    username: "vpt",
    displayName: "VPT",
    email: "vpt@example.com",
    mark: "博主",
    roles: ["ROLE_ADMIN"],
    isVip: false,
    isAdmin: true,
    isOnline: true,
    accountStatus: "active",
    sanctionState: "active",
    lastActiveAt: "2026/06/26 16:00",
    registerAt: "2026/01/01 08:00",
  },
];

const mockRefetch = vi.fn();
const mockSetFilters = vi.fn();
const mockSetPage = vi.fn();

vi.mock("./hooks/use-admin-user-list", () => ({
  useAdminUserList: vi.fn(),
}));

vi.mock("../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: vi.fn(() => true),
}));

vi.mock("./components/UserDetailModal", () => ({
  UserDetailModal: ({ userId }: { userId: number | null }) =>
    userId === null ? null : <div>详情用户 {userId}</div>,
}));

function renderUsersPage() {
  return render(
    <MemoryRouter>
      <UsersPage />
      <ToastRegion queue={toastQueue} />
    </MemoryRouter>,
  );
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMdScreen).mockReturnValue(true);
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(useAdminUserList).mockReturnValue({
      rows: mockRows,
      pageData: { total: 1, pages: 1, page: 1, page_size: 10, list: [] },
      isLoading: false,
      error: null,
      page: 1,
      setPage: mockSetPage,
      filters: { keyword: "", role: "all", status: "all" },
      setFilters: mockSetFilters,
      resetListQuery: vi.fn(),
      hasActiveListQuery: false,
      refetch: mockRefetch,
    });
  });

  it("渲染用户表格与标题", () => {
    renderUsersPage();

    expect(screen.getByRole("heading", { name: "用户管理" })).toBeInTheDocument();
    expect(screen.getByText("VPT")).toBeInTheDocument();
    expect(screen.getByText("博主")).toBeInTheDocument();
  });

  it("移动端列表容器限制在视口宽度内", () => {
    vi.mocked(useIsMdScreen).mockReturnValue(false);

    renderUsersPage();

    const region = screen.getByRole("region", { name: "用户列表" });
    expect(region).toHaveClass("min-w-0");
    expect(region.parentElement).toHaveClass("max-w-full");
    const toolsButton = screen.getByRole("button", { name: "工具" });
    expect(toolsButton.parentElement).toHaveClass("min-w-0", "flex-col", "sm:flex-row");
    expect(toolsButton).toHaveClass("w-full", "sm:w-auto");
  });

  it("显示账号、内容列与工具入口，并移除常驻头像工具", () => {
    renderUsersPage();

    expect(screen.getByRole("columnheader", { name: "账号" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "内容" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "工具" })).toBeInTheDocument();
    expect(screen.queryByText("头像归一化")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看详情" })).toBeInTheDocument();
  });

  it("点击查看详情后打开对应用户弹层", async () => {
    const user = userEvent.setup();
    renderUsersPage();

    await user.click(screen.getByRole("button", { name: "查看详情" }));
    expect(screen.getByText("详情用户 7")).toBeInTheDocument();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useAdminUserList).mockReturnValue({
      rows: [],
      pageData: null,
      isLoading: false,
      error: new Error("加载用户失败"),
      page: 1,
      setPage: mockSetPage,
      filters: { keyword: "", role: "all", status: "all" },
      setFilters: mockSetFilters,
      resetListQuery: vi.fn(),
      hasActiveListQuery: false,
      refetch: mockRefetch,
    });

    renderUsersPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载用户失败");
  });
});
