import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastRegion } from "@repo/ui";
import { CategoryArticlesDrawer } from "./CategoryArticlesDrawer";
import { toastQueue } from "../../../lib/toast";
import { useCategoryArticles } from "../hooks/use-category-articles";
import type { CategoryRow } from "../model";

const category: CategoryRow = {
  id: "1",
  name: "编程",
  seq: 0,
  articleCount: 1,
};

const mockHookReturn = {
  rows: [{ id: "10", title: "Go 入门", excerpt: "简介" }],
  page: 1,
  totalPages: 1,
  total: 1,
  isLoading: false,
  error: null,
  search: "",
  setSearch: vi.fn(),
  setPage: vi.fn(),
  refetch: vi.fn(),
  removeArticle: vi.fn().mockResolvedValue(undefined),
  removingArticleId: null,
  isAddViewOpen: false,
  openAddView: vi.fn(),
  closeAddView: vi.fn(),
  pickerRows: [],
  pickerPage: 1,
  pickerTotalPages: 1,
  pickerSearch: "",
  setPickerSearch: vi.fn(),
  setPickerPage: vi.fn(),
  isPickerLoading: false,
  pickerError: null,
  selectedArticleIds: [],
  toggleSelectedArticle: vi.fn(),
  addSelectedArticles: vi.fn().mockResolvedValue(undefined),
  isAdding: false,
};

vi.mock("../hooks/use-category-articles", () => ({
  useCategoryArticles: vi.fn(),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

function renderDrawer(props: Partial<ComponentProps<typeof CategoryArticlesDrawer>> = {}) {
  return render(
    <MemoryRouter>
      <CategoryArticlesDrawer category={category} isOpen onClose={vi.fn()} {...props} />
      <ToastRegion queue={toastQueue} />
    </MemoryRouter>,
  );
}

describe("CategoryArticlesDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    vi.mocked(useCategoryArticles).mockReturnValue({ ...mockHookReturn });
  });

  it("展示分类文章列表", () => {
    renderDrawer();

    expect(screen.getByRole("dialog", { name: "管理文章 · 编程" })).toBeInTheDocument();
    expect(screen.getByText("Go 入门")).toBeInTheDocument();
    expect(screen.getByText("共 1 篇文章")).toBeInTheDocument();
    expect(screen.getByText("分类文章")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭文章管理" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭" }).closest("footer")).toHaveClass(
      "bg-muted/15",
    );
  });

  it("点击添加文章进入添加视图", async () => {
    const user = userEvent.setup();
    const openAddView = vi.fn();
    vi.mocked(useCategoryArticles).mockReturnValue({
      ...mockHookReturn,
      openAddView,
    });

    renderDrawer();
    await user.click(screen.getByRole("button", { name: /添加文章/i }));

    expect(openAddView).toHaveBeenCalled();
  });

  it("移除文章成功后显示 toast", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "移除" }));

    await waitFor(() => {
      expect(screen.getByText("已移出分类")).toBeInTheDocument();
    });
  });

  it("添加视图展示候选与批量添加按钮", () => {
    vi.mocked(useCategoryArticles).mockReturnValue({
      ...mockHookReturn,
      isAddViewOpen: true,
      pickerRows: [{ id: "11", title: "React 技巧", excerpt: "摘要", otherCategory: "前端" }],
      selectedArticleIds: ["11"],
    });

    renderDrawer();

    expect(screen.getByText("React 技巧")).toBeInTheDocument();
    expect(screen.getByText(/当前分类：前端/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /添加 1 篇/i })).toBeInTheDocument();
  });
});
