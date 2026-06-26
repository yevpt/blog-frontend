import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { CommentsPage } from "./CommentsPage";
import { apiClient } from "../../lib/api";
import { toastQueue } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { useAdminCommentList } from "./hooks/use-admin-comment-list";
import type { CommentRow } from "./model";

const mockRows: CommentRow[] = [
  {
    id: "9",
    targetType: "article",
    targetLabel: "文章",
    targetId: 3,
    authorName: "vpt",
    content: "测试评论",
    replyCount: 2,
    likeCount: 4,
    createdAt: "2026/06/26 16:00",
  },
];

const mockRefetch = vi.fn();
const mockSetSearch = vi.fn();
const mockSetTargetType = vi.fn();
const mockSetPage = vi.fn();

vi.mock("./hooks/use-admin-comment-list", () => ({
  useAdminCommentList: vi.fn(),
}));

vi.mock("../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: vi.fn(() => true),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    comments: {
      deleteArticle: vi.fn(),
      deleteMoment: vi.fn(),
    },
  },
}));

function renderCommentsPage() {
  return render(
    <>
      <CommentsPage />
      <ToastRegion queue={toastQueue} />
    </>,
  );
}

describe("CommentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(apiClient.comments.deleteArticle).mockResolvedValue({ id: 9 });
    vi.mocked(apiClient.comments.deleteMoment).mockResolvedValue({ id: 9 });
    vi.mocked(useAdminCommentList).mockReturnValue({
      rows: mockRows,
      pageData: { total: 1, pages: 1, page: 1, page_size: 10, list: [] },
      isLoading: false,
      error: null,
      page: 1,
      setPage: mockSetPage,
      filters: { targetType: "all", search: "" },
      setSearch: mockSetSearch,
      setTargetType: mockSetTargetType,
      refetch: mockRefetch,
    });
  });

  it("渲染评论表格与标题", () => {
    renderCommentsPage();

    expect(screen.getByRole("heading", { name: "评论管理" })).toBeInTheDocument();
    expect(screen.getByText("测试评论")).toBeInTheDocument();
    expect(screen.getByText("vpt")).toBeInTheDocument();
  });

  it("移动端列表容器限制在视口宽度内", () => {
    vi.mocked(useIsMdScreen).mockReturnValue(false);

    renderCommentsPage();

    expect(screen.getByRole("region", { name: "评论列表" })).toHaveClass("min-w-0", "max-w-full");
  });

  it("点击删除文章评论后调用删除接口并刷新", async () => {
    const user = userEvent.setup();
    renderCommentsPage();

    await user.click(screen.getByRole("button", { name: "删除" }));
    await user.click(await screen.findByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(apiClient.comments.deleteArticle).toHaveBeenCalledWith(9);
    });
    expect(apiClient.comments.deleteMoment).not.toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useAdminCommentList).mockReturnValue({
      rows: [],
      pageData: null,
      isLoading: false,
      error: new Error("加载评论失败"),
      page: 1,
      setPage: mockSetPage,
      filters: { targetType: "all", search: "" },
      setSearch: mockSetSearch,
      setTargetType: mockSetTargetType,
      refetch: mockRefetch,
    });

    renderCommentsPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载评论失败");
  });
});
