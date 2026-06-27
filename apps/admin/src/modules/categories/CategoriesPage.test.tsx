import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { CategoriesPage } from "./CategoriesPage";
import { toastQueue } from "../../lib/toast";
import { renderWithAdminRouter } from "../../test/render-with-admin-router";
import { useCategoryList } from "./hooks/use-category-list";
import type { CategoryRow } from "./model";

const mockRows: CategoryRow[] = [
  {
    id: "1",
    name: "编程",
    url: "programming",
    icon: "https://cdn.example.com/icon.svg",
    description: "编程学习与工程实践",
    coverImgUrl: "https://cdn.example.com/cover.jpg",
    seq: 0,
    articleCount: 12,
  },
];

const mockRefetch = vi.fn();

vi.mock("./hooks/use-category-list", () => ({
  useCategoryList: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    categories: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      addArticles: vi.fn(),
      removeArticles: vi.fn(),
    },
    articles: {
      listAdmin: vi.fn().mockResolvedValue({
        total: 0,
        pages: 0,
        page: 1,
        page_size: 10,
        list: [],
      }),
    },
    uploads: {
      tempImage: vi.fn(),
    },
  },
}));

function renderCategoriesPage() {
  return renderWithAdminRouter(
    <>
      <CategoriesPage />
      <ToastRegion queue={toastQueue} />
    </>,
  );
}

describe("CategoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(useCategoryList).mockReturnValue({
      rows: mockRows,
      items: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it("渲染分类列表与标题", () => {
    renderCategoriesPage();

    expect(screen.getByRole("heading", { name: "分类管理" })).toBeInTheDocument();
    expect(screen.getByText("编程")).toBeInTheDocument();
    expect(screen.getByText("编程学习与工程实践")).toBeInTheDocument();
  });

  it("空列表时显示空态", () => {
    vi.mocked(useCategoryList).mockReturnValue({
      rows: [],
      items: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderCategoriesPage();

    expect(screen.getByText("还没有分类")).toBeInTheDocument();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useCategoryList).mockReturnValue({
      rows: [],
      items: [],
      isLoading: false,
      error: new Error("加载分类失败"),
      refetch: mockRefetch,
    });

    renderCategoriesPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载分类失败");
  });

  it("点击新建分类打开表单弹窗", async () => {
    const user = userEvent.setup();
    renderCategoriesPage();

    await user.click(screen.getAllByRole("button", { name: /新建分类/i })[0]!);

    expect(await screen.findByRole("dialog", { name: "新建分类" })).toBeInTheDocument();
  });

  it("点击编辑打开编辑弹窗", async () => {
    const user = userEvent.setup();
    renderCategoriesPage();

    await user.click(screen.getAllByRole("button", { name: "编辑" })[0]!);

    expect(await screen.findByRole("dialog", { name: "编辑分类" })).toBeInTheDocument();
  });

  it("点击删除打开确认弹窗", async () => {
    const user = userEvent.setup();
    renderCategoriesPage();

    await user.click(screen.getAllByRole("button", { name: "删除" })[0]!);

    await waitFor(() => {
      expect(screen.getByText(/删除「编程」/)).toBeInTheDocument();
    });
  });

  it("点击管理文章打开 Drawer", async () => {
    const user = userEvent.setup();
    renderCategoriesPage();

    await user.click(screen.getAllByRole("button", { name: "管理文章" })[0]!);

    expect(await screen.findByRole("dialog", { name: "管理文章 · 编程" })).toBeInTheDocument();
  });
});
