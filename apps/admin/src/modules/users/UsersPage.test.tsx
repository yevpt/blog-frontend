import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { apiClient } from "../../lib/api";
import { toastQueue } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { UsersPage } from "./UsersPage";
import { useAdminUserList } from "./hooks/use-admin-user-list";
import type { UserRow } from "./model";

const mockRows: UserRow[] = [
  {
    id: "7",
    displayName: "VPT",
    mark: "博主",
    roles: ["ROLE_ADMIN"],
    isVip: false,
    isAdmin: true,
    isOnline: true,
    lastActiveAt: "2026/06/26 16:00",
  },
];

const mockRefetch = vi.fn();
const mockSetSearch = vi.fn();
const mockSetPage = vi.fn();

vi.mock("./hooks/use-admin-user-list", () => ({
  useAdminUserList: vi.fn(),
}));

vi.mock("../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: vi.fn(() => true),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    users: {
      grantVipRole: vi.fn(),
      revokeVipRole: vi.fn(),
    },
  },
}));

function renderUsersPage() {
  return render(
    <>
      <UsersPage />
      <ToastRegion queue={toastQueue} />
    </>,
  );
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(apiClient.users.grantVipRole).mockResolvedValue({ user_id: 7, roles: ["ROLE_VIP"] });
    vi.mocked(apiClient.users.revokeVipRole).mockResolvedValue({ user_id: 7, roles: [] });
    vi.mocked(useAdminUserList).mockReturnValue({
      rows: mockRows,
      visibleRows: mockRows,
      pageData: { total: 1, pages: 1, page: 1, page_size: 10, list: [] },
      isLoading: false,
      error: null,
      page: 1,
      setPage: mockSetPage,
      search: "",
      setSearch: mockSetSearch,
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

    expect(screen.getByRole("region", { name: "用户列表" })).toHaveClass("min-w-0", "max-w-full");
  });

  it("点击授予 VIP 后调用接口并刷新", async () => {
    const user = userEvent.setup();
    renderUsersPage();

    await user.click(screen.getByRole("button", { name: "授予 VIP" }));

    await waitFor(() => {
      expect(apiClient.users.grantVipRole).toHaveBeenCalledWith(7);
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useAdminUserList).mockReturnValue({
      rows: [],
      visibleRows: [],
      pageData: null,
      isLoading: false,
      error: new Error("加载用户失败"),
      page: 1,
      setPage: mockSetPage,
      search: "",
      setSearch: mockSetSearch,
      resetListQuery: vi.fn(),
      hasActiveListQuery: false,
      refetch: mockRefetch,
    });

    renderUsersPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载用户失败");
  });
});
