import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastRegion } from "@repo/ui";
import { ApiError } from "@repo/api";
import { ArticlesPage } from "./ArticlesPage";
import { apiClient } from "../../lib/api";
import { toastQueue } from "../../lib/toast";
import type { ArticleRow } from "./model";
import { useAdminArticleFilterOptions } from "./hooks/use-article-filter-options";
import { useAdminArticleList } from "./hooks/use-article-list";

const mockRows: ArticleRow[] = [
  {
    id: "1",
    title: "React Query 与后台表格状态",
    excerpt: "用稳定的数据状态承载后台筛选、分页与刷新。",
    status: "published",
    category: "工程",
    isPinned: true,
    createdAt: "2026/06/16",
    updatedAt: "2026/06/16",
  },
  {
    id: "2",
    title: "Vite 管理后台的主题方案",
    excerpt: "记录后台浅色、深色主题和设计令牌的接入方式。",
    status: "hidden",
    category: "前端",
    isPinned: false,
    createdAt: "2026/06/15",
    updatedAt: "2026/06/15",
  },
];

const mockRefetch = vi.fn();
const mockSetSearch = vi.fn();
const mockSetCategoryId = vi.fn();
const mockSetSort = vi.fn();
const mockSetPage = vi.fn();

vi.mock("./hooks/use-article-list", () => ({
  useAdminArticleList: vi.fn(),
}));

vi.mock("./hooks/use-article-filter-options", () => ({
  useAdminArticleFilterOptions: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    articles: {
      deleteAdmin: vi.fn(),
    },
  },
}));

function renderArticlesPage() {
  return render(
    <MemoryRouter>
      <ArticlesPage />
      <ToastRegion queue={toastQueue} />
    </MemoryRouter>,
  );
}

describe("ArticlesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(useAdminArticleList).mockReturnValue({
      rows: mockRows,
      pageData: { total: 42, pages: 3, page: 1, page_size: 10, list: [] },
      isLoading: false,
      error: null,
      page: 1,
      setPage: mockSetPage,
      filters: {
        categoryId: "all",
        search: "",
      },
      sort: { column: "createdAt", direction: "descending" },
      setSort: mockSetSort,
      setSearch: mockSetSearch,
      setCategoryId: mockSetCategoryId,
      refetch: mockRefetch,
    });
    vi.mocked(useAdminArticleFilterOptions).mockReturnValue({
      categoryOptions: [
        { value: "all", label: "全部" },
        { value: "2", label: "前端" },
      ],
      isLoading: false,
      error: null,
    });
    vi.mocked(apiClient.articles.deleteAdmin).mockResolvedValue({
      id: 1,
      title: "React Query 与后台表格状态",
      content: "body",
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 0,
      like_count: 0,
      comment_count: 0,
      is_recommended: false,
      created_at: "2026-06-16T00:00:00Z",
      updated_at: "2026-06-16T00:00:00Z",
    });
  });

  it("渲染以表格为主体的文章管理页", () => {
    renderArticlesPage();

    expect(screen.getByRole("heading", { name: "文章管理" })).toBeInTheDocument();
    expect(
      screen.queryByText("集中查看文章、按表头筛选排序，并从标题直接进入编辑页面。"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "置顶管理" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新建" })).toHaveAttribute("href", "/articles/new");
    expect(screen.getByText("全部 42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "筛选分类：全部" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "更多筛选" })).not.toBeInTheDocument();
    expect(screen.getByText("共 42 条")).toHaveClass("whitespace-nowrap");

    const listRegion = screen.getByRole("region", { name: "文章列表工具栏" });
    expect(
      Array.from(listRegion.children).some(
        (child) =>
          child.tagName === "DIV" && child.childElementCount === 0 && child.textContent === "",
      ),
    ).toBe(false);

    const table = screen.getByRole("grid", { name: "文章列表" });
    expect(within(table).getByRole("columnheader", { name: /创建时间/ })).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "筛选分类" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "筛选推荐" })).not.toBeInTheDocument();
    expect(
      within(table).getByRole("button", { name: "创建时间排序：降序，点击切换为升序" }),
    ).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "React Query 与后台表格状态" })).toHaveAttribute(
      "href",
      "/articles/1/edit",
    );
  });

  it("加载失败时展示错误提示", () => {
    vi.mocked(useAdminArticleList).mockReturnValue({
      rows: [],
      pageData: null,
      isLoading: false,
      error: new Error("加载文章列表失败"),
      page: 1,
      setPage: mockSetPage,
      filters: { categoryId: "all", search: "" },
      sort: { column: "createdAt", direction: "descending" },
      setSort: mockSetSort,
      setSearch: mockSetSearch,
      setCategoryId: mockSetCategoryId,
      refetch: mockRefetch,
    });

    renderArticlesPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载文章列表失败");
  });

  it("展开搜索后将输入交给服务端查询", async () => {
    const user = userEvent.setup();
    vi.mocked(useAdminArticleList).mockImplementation(() => {
      const [search, setSearchState] = useState("");

      return {
        rows: mockRows,
        pageData: { total: 42, pages: 3, page: 1, page_size: 10, list: [] },
        isLoading: false,
        error: null,
        page: 1,
        setPage: mockSetPage,
        filters: {
          categoryId: "all",
          search,
        },
        sort: { column: "createdAt", direction: "descending" },
        setSort: mockSetSort,
        setSearch: (value: string) => {
          mockSetSearch(value);
          setSearchState(value);
        },
        setCategoryId: mockSetCategoryId,
        refetch: mockRefetch,
      };
    });
    renderArticlesPage();

    await user.click(screen.getByRole("button", { name: "展开搜索" }));
    const searchbox = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
    await user.type(searchbox, "Vite");

    expect(mockSetSearch).toHaveBeenCalled();
    expect(mockSetSearch.mock.calls.some(([value]) => String(value).includes("Vite"))).toBe(true);
  });

  it("分类筛选变更时调用 setCategoryId", async () => {
    const user = userEvent.setup();
    renderArticlesPage();

    await user.click(screen.getByRole("button", { name: "筛选分类：全部" }));
    await user.click(screen.getByRole("menuitemradio", { name: "前端" }));

    expect(mockSetCategoryId).toHaveBeenCalledWith("2");
  });

  it("表头排序变更时调用 setSort", async () => {
    const user = userEvent.setup();
    renderArticlesPage();

    await user.click(screen.getByRole("button", { name: "状态排序：未排序，点击排序" }));

    expect(mockSetSort).toHaveBeenCalledWith({ column: "status", direction: "descending" });
  });

  it("多页时展示分页控件", () => {
    renderArticlesPage();

    expect(screen.getByRole("navigation", { name: "分页导航" })).toBeInTheDocument();
  });

  it("删除文章前弹出二次确认，确认后调用删除接口并刷新列表", async () => {
    const user = userEvent.setup();
    renderArticlesPage();

    const table = screen.getByRole("grid", { name: "文章列表" });
    await user.click(within(table).getAllByRole("button", { name: "删除文章" })[0]);

    const dialog = screen.getByRole("dialog", { name: /确认删除「React Query 与后台表格状态」/ });
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(apiClient.articles.deleteAdmin).toHaveBeenCalledWith(1);
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("删除失败时展示 toast 且不关闭确认弹窗", async () => {
    vi.mocked(apiClient.articles.deleteAdmin).mockRejectedValue(new ApiError(404, "文章不存在"));
    const user = userEvent.setup();
    renderArticlesPage();

    const table = screen.getByRole("grid", { name: "文章列表" });
    await user.click(within(table).getAllByRole("button", { name: "删除文章" })[0]);
    const dialog = screen.getByRole("dialog", { name: /确认删除「React Query 与后台表格状态」/ });
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.getByText("文章不存在")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("dialog", { name: /确认删除「React Query 与后台表格状态」/ }),
    ).toBeInTheDocument();
  });
});
