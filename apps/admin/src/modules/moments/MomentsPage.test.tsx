import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { apiClient } from "../../lib/api";
import { toastQueue } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { MomentsPage } from "./MomentsPage";
import { useAdminMomentList } from "./hooks/use-admin-moment-list";
import type { MomentRow } from "./model";

const mockRows: MomentRow[] = [
  {
    id: "9",
    authorName: "vpt",
    content: "风",
    status: 1,
    statusLabel: "公开",
    commentStatus: 1,
    isTop: false,
    imageCount: 0,
    readCount: 10,
    likeCount: 2,
    commentCount: 3,
    createdAt: "2026/06/26 16:00",
  },
];

const mockRefetch = vi.fn();
const mockSetSearch = vi.fn();
const mockSetStatus = vi.fn();
const mockSetPage = vi.fn();

vi.mock("./hooks/use-admin-moment-list", () => ({
  useAdminMomentList: vi.fn(),
}));

vi.mock("../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: vi.fn(() => true),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    moments: {
      delete: vi.fn(),
      setTop: vi.fn(),
      removeTop: vi.fn(),
    },
  },
}));

function renderMomentsPage() {
  return render(
    <>
      <MomentsPage />
      <ToastRegion queue={toastQueue} />
    </>,
  );
}

describe("MomentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(apiClient.moments.delete).mockResolvedValue({ id: 9 });
    vi.mocked(apiClient.moments.setTop).mockResolvedValue({ id: 9, is_top: true });
    vi.mocked(apiClient.moments.removeTop).mockResolvedValue({ id: 9, is_top: false });
    vi.mocked(useAdminMomentList).mockReturnValue({
      rows: mockRows,
      pageData: { total: 1, pages: 1, page: 1, page_size: 10, list: [] },
      isLoading: false,
      error: null,
      page: 1,
      setPage: mockSetPage,
      filters: { status: "all", search: "" },
      setSearch: mockSetSearch,
      setStatus: mockSetStatus,
      refetch: mockRefetch,
    });
  });

  it("渲染动态表格与标题", () => {
    renderMomentsPage();

    expect(screen.getByRole("heading", { name: "动态管理" })).toBeInTheDocument();
    expect(screen.getByText("风")).toBeInTheDocument();
    expect(screen.getByText("vpt")).toBeInTheDocument();
  });

  it("移动端列表容器限制在视口宽度内", () => {
    vi.mocked(useIsMdScreen).mockReturnValue(false);

    renderMomentsPage();

    expect(screen.getByRole("region", { name: "动态列表" })).toHaveClass("min-w-0", "max-w-full");
  });

  it("点击置顶后调用置顶接口并刷新", async () => {
    const user = userEvent.setup();
    renderMomentsPage();

    await user.click(screen.getByRole("button", { name: "置顶" }));

    await waitFor(() => {
      expect(apiClient.moments.setTop).toHaveBeenCalledWith(9);
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("点击删除动态后调用删除接口并刷新", async () => {
    const user = userEvent.setup();
    renderMomentsPage();

    await user.click(screen.getByRole("button", { name: "删除" }));
    await user.click(await screen.findByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(apiClient.moments.delete).toHaveBeenCalledWith(9);
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useAdminMomentList).mockReturnValue({
      rows: [],
      pageData: null,
      isLoading: false,
      error: new Error("加载动态失败"),
      page: 1,
      setPage: mockSetPage,
      filters: { status: "all", search: "" },
      setSearch: mockSetSearch,
      setStatus: mockSetStatus,
      refetch: mockRefetch,
    });

    renderMomentsPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载动态失败");
  });
});
