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
    images: [
      { id: "1", name: "wind.jpg", url: "moments/wind.jpg", accessUrl: "https://cdn/wind.jpg" },
    ],
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
      save: vi.fn(),
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
    vi.mocked(apiClient.moments.save).mockResolvedValue({
      id: 9,
      user_id: 1,
      content: "新碎语",
      status: 1,
      comment_status: 1,
      read_count: 0,
      is_top: false,
      like_count: 0,
      comment_count: 0,
      is_liked: false,
      images: [],
      created_at: "2026-06-26T08:00:00Z",
      updated_at: "2026-06-26T08:00:00Z",
    });
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
      resetListQuery: vi.fn(),
      hasActiveListQuery: false,
      refetch: mockRefetch,
    });
  });

  it("渲染碎语表格与标题", () => {
    renderMomentsPage();

    expect(screen.getByRole("heading", { name: "碎语管理" })).toBeInTheDocument();
    expect(screen.getByText("风")).toBeInTheDocument();
    expect(screen.getByText("vpt")).toBeInTheDocument();
  });

  it("移动端列表容器限制在视口宽度内", () => {
    vi.mocked(useIsMdScreen).mockReturnValue(false);

    renderMomentsPage();

    expect(screen.getByRole("region", { name: "碎语列表" })).toHaveClass("min-w-0", "max-w-full");
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

  it("新建碎语时调用保存接口并刷新", async () => {
    const user = userEvent.setup();
    renderMomentsPage();

    await user.click(screen.getByRole("button", { name: "新建碎语" }));
    await user.type(screen.getByLabelText("碎语内容"), "新碎语");
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(apiClient.moments.save).toHaveBeenCalledWith({
        id: undefined,
        content: "新碎语",
        status: 1,
        comment_status: 1,
        image_urls: [],
        image_order: [],
      });
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("编辑碎语时保留已有图片并调用保存接口", async () => {
    const user = userEvent.setup();
    renderMomentsPage();

    await user.click(screen.getByRole("button", { name: "编辑" }));
    const contentInput = screen.getByLabelText("碎语内容");
    await user.clear(contentInput);
    await user.type(contentInput, "风很温柔");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(apiClient.moments.save).toHaveBeenCalledWith({
        id: 9,
        content: "风很温柔",
        status: 1,
        comment_status: 1,
        image_urls: ["moments/wind.jpg"],
        image_order: ["url:0"],
      });
    });
  });

  it("点击删除碎语后调用删除接口并刷新", async () => {
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
      error: new Error("加载碎语失败"),
      page: 1,
      setPage: mockSetPage,
      filters: { status: "all", search: "" },
      setSearch: mockSetSearch,
      setStatus: mockSetStatus,
      resetListQuery: vi.fn(),
      hasActiveListQuery: false,
      refetch: mockRefetch,
    });

    renderMomentsPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载碎语失败");
  });
});
