import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { clearCircleListCache, setCircleListCache } from "@/lib/circle-list-cache";
import { CircleList } from "./circle-list";

const mockApiJson = vi.hoisted(() => vi.fn());

vi.mock("@/lib/client-fetch", () => ({
  apiJson: mockApiJson,
}));

vi.mock("react-virtuoso", () => ({
  VirtuosoGrid: ({
    data,
    itemContent,
  }: {
    data: Array<{ id: number; nickname: string }>;
    itemContent: (index: number, item: { id: number; nickname: string }) => ReactNode;
  }) => <div data-testid="virtuoso-grid">{data.map((item, i) => itemContent(i, item))}</div>,
}));

vi.mock("@/components/common/base-user-card", () => ({
  BaseUserCard: ({
    user,
    deferAvatar,
  }: {
    user: { nickname?: string | null };
    deferAvatar?: boolean;
  }) => (
    <div data-testid="user-card" data-defer-avatar={deferAvatar ? "true" : "false"}>
      {user.nickname}
    </div>
  ),
}));

vi.mock("@repo/hooks", () => ({
  useHydrated: () => true,
  usePresence: () => ({ record: undefined }),
}));

const initialPage = {
  list: [
    { id: 2, nickname: "Admin", avatar_url: "", roles: ["admin"], last_login_at: undefined },
    { id: 1, nickname: "Regular", avatar_url: "", roles: [], last_login_at: undefined },
  ],
  total: 2,
  pages: 1,
  page: 1,
  page_size: 50,
};

beforeEach(() => {
  vi.clearAllMocks();
  clearCircleListCache();
});

test("SSR 首屏直接渲染服务端用户列表，头像延迟到客户端", () => {
  render(<CircleList initialPage={initialPage} />);

  expect(screen.getByTestId("virtuoso-grid")).toBeInTheDocument();
  expect(screen.getByText("Admin")).toBeInTheDocument();
  expect(screen.getByText("Regular")).toBeInTheDocument();
  expect(screen.getAllByTestId("user-card")[0]).toHaveAttribute("data-defer-avatar", "true");
  expect(mockApiJson).not.toHaveBeenCalled();
});

test("返回圈子页时从内存缓存恢复已加载列表", () => {
  setCircleListCache({
    users: [
      ...initialPage.list,
      { id: 3, nickname: "Loaded More", avatar_url: "", roles: [], last_login_at: undefined },
    ],
    currentPage: 2,
    totalPages: 2,
    endReached: true,
  });

  render(<CircleList initialPage={initialPage} />);

  expect(screen.getByText("Loaded More")).toBeInTheDocument();
  expect(mockApiJson).not.toHaveBeenCalled();
});
