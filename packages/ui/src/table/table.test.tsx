import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge, Button } from "../index";
import { DataTable, type DataTableColumn, type DataTableState } from ".";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

interface ArticleRow {
  id: string;
  title: string;
  status: "published" | "draft" | "archived";
  category: string;
  updatedAt: string;
}

const rows: ArticleRow[] = [
  {
    id: "react-query",
    title: "React Query 与后台表格状态",
    status: "published",
    category: "工程",
    updatedAt: "2026-06-16",
  },
  {
    id: "vite-theme",
    title: "Vite 管理后台的主题方案",
    status: "draft",
    category: "前端",
    updatedAt: "2026-06-15",
  },
  {
    id: "old-link-cleanup",
    title: "旧友链清理记录",
    status: "archived",
    category: "站点",
    updatedAt: "2026-06-08",
  },
];

const statusLabel: Record<ArticleRow["status"], string> = {
  published: "已发布",
  draft: "草稿",
  archived: "已归档",
};

const columns: Array<DataTableColumn<ArticleRow>> = [
  {
    id: "title",
    header: "标题",
    isRowHeader: true,
    width: 320,
    cell: (article) => article.title,
  },
  {
    id: "status",
    header: "状态",
    width: 120,
    cell: (article) => <Badge variant="secondary">{statusLabel[article.status]}</Badge>,
    filter: {
      type: "single",
      defaultValue: "all",
      options: [
        { value: "all", label: "全部" },
        { value: "published", label: "已发布" },
        { value: "draft", label: "草稿" },
        { value: "archived", label: "已归档" },
      ],
      match: (article, value) => value === "all" || article.status === value,
    },
  },
  {
    id: "updatedAt",
    header: "更新时间",
    width: 140,
    cell: (article) => article.updatedAt,
    sort: {
      defaultDirection: "descending",
      value: (article) => article.updatedAt,
    },
  },
  {
    id: "actions",
    header: "操作",
    width: 90,
    className: "text-right",
    headerClassName: "text-right",
    cell: () => (
      <Button type="button" variant="ghost" size="sm" onPress={() => undefined}>
        删除
      </Button>
    ),
  },
];

function renderArticleTable(props?: {
  state?: DataTableState;
  onStateChange?: (state: DataTableState) => void;
  isLoading?: boolean;
}) {
  return render(
    <DataTable
      aria-label="文章"
      items={rows}
      columns={columns}
      getRowId={(article) => article.id}
      search={{
        placeholder: "搜索文章",
        match: (article, keyword) =>
          [article.title, article.category].join(" ").toLowerCase().includes(keyword.toLowerCase()),
      }}
      emptyText="暂无文章"
      loadingText="加载中"
      {...props}
    />,
  );
}

function getArticleLinks() {
  return within(screen.getByRole("grid", { name: "文章" })).getAllByRole("rowheader");
}

describe("DataTable", () => {
  it("通过列配置渲染表头、行与单元格", () => {
    renderArticleTable();

    const table = screen.getByRole("grid", { name: "文章" });
    expect(within(table).getByRole("columnheader", { name: /标题/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /状态/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /更新时间/ })).toBeInTheDocument();
    expect(
      within(table).getByRole("rowheader", { name: "React Query 与后台表格状态" }),
    ).toBeInTheDocument();
    expect(within(table).getAllByRole("button", { name: "删除" })).toHaveLength(3);
    expect(screen.getByText("共 3 条")).toBeInTheDocument();
  });

  it("支持 root className 与内部 slot classNames 定制", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        className="table-root"
        classNames={{
          container: "table-container",
          headerCell: "table-header-cell",
          cell: "table-cell",
          filterPopover: "table-filter-popover",
        }}
      />,
    );

    expect(container.firstElementChild).toHaveClass("table-root");
    expect(container.querySelector(".table-container")).toBeInTheDocument();
    expect(container.querySelector(".table-header-cell")).toBeInTheDocument();
    expect(container.querySelector(".table-cell")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "筛选状态" }));

    expect(screen.getByRole("dialog", { name: "筛选状态" })).toHaveClass("table-filter-popover");
  });

  it("通过内置搜索过滤可见行", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    await user.type(screen.getByRole("searchbox", { name: "搜索文章" }), "Vite");

    expect(screen.getByRole("rowheader", { name: "Vite 管理后台的主题方案" })).toBeInTheDocument();
    expect(
      screen.queryByRole("rowheader", { name: "React Query 与后台表格状态" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("共 1 条")).toBeInTheDocument();
  });

  it("通过单选过滤配置过滤行并更新触发按钮状态", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    await user.click(screen.getByRole("button", { name: "筛选状态" }));
    await user.click(screen.getByRole("menuitemradio", { name: "草稿" }));

    expect(screen.getByRole("button", { name: "筛选状态：草稿" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("rowheader", { name: "Vite 管理后台的主题方案" })).toBeInTheDocument();
    expect(
      screen.queryByRole("rowheader", { name: "React Query 与后台表格状态" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("共 1 条")).toBeInTheDocument();
  });

  it("筛选入口使用通用 filter 图标并将状态限制在表头按钮内", () => {
    renderArticleTable();

    const filterButton = screen.getByRole("button", { name: "筛选状态" });

    expect(within(filterButton).getByTestId("icon-filter")).toBeInTheDocument();
    expect(filterButton).not.toHaveClass("focus-visible:ring-2");
    expect(filterButton).not.toHaveClass("focus-visible:ring-offset-2");
  });

  it("筛选弹窗以触发图标为中心向下展开", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    await user.click(screen.getByRole("button", { name: "筛选状态" }));

    expect(screen.getByRole("dialog", { name: "筛选状态" })).toHaveAttribute(
      "data-placement",
      "bottom",
    );
  });

  it("点击可排序表头整体切换方向并重排行", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    expect(getArticleLinks()[0]).toHaveTextContent("React Query 与后台表格状态");
    expect(
      screen.getByRole("button", { name: "更新时间排序：降序，点击切换为升序" }),
    ).not.toHaveAttribute("aria-pressed");

    await user.click(screen.getByRole("columnheader", { name: /更新时间/ }));

    expect(
      screen.getByRole("button", { name: "更新时间排序：升序，点击切换为降序" }),
    ).not.toHaveAttribute("aria-pressed");
    expect(getArticleLinks()[0]).toHaveTextContent("旧友链清理记录");
  });

  it("点击筛选按钮不会触发表头排序", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    await user.click(screen.getByRole("button", { name: "筛选状态" }));

    expect(getArticleLinks()[0]).toHaveTextContent("React Query 与后台表格状态");
  });

  it("未排序状态下排序按钮提供准确的无障碍文案", () => {
    renderArticleTable({ state: { searchValue: "", filters: { status: "all" } } });

    expect(
      screen.getByRole("button", { name: "更新时间排序：未排序，点击排序" }),
    ).not.toHaveAttribute("aria-pressed");
  });

  it("排序激活态只改变图标状态，不使用背景胶囊样式", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    await user.click(screen.getByRole("columnheader", { name: /更新时间/ }));

    const sortButton = screen.getByRole("button", {
      name: "更新时间排序：升序，点击切换为降序",
    });
    expect(sortButton).not.toHaveClass("bg-primary/10");
    expect(sortButton.querySelector(".text-primary")).toBeTruthy();
  });

  it("受控状态模式下只回传下一份表格状态", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    const state: DataTableState = {
      searchValue: "",
      filters: { status: "all" },
      sort: { column: "updatedAt", direction: "descending" },
    };
    renderArticleTable({ state, onStateChange });

    await user.click(screen.getByRole("columnheader", { name: /更新时间/ }));

    expect(onStateChange).toHaveBeenCalledWith({
      searchValue: "",
      filters: { status: "all" },
      sort: { column: "updatedAt", direction: "ascending" },
    });
  });

  it("加载中时展示加载文案", () => {
    renderArticleTable({ isLoading: true });

    expect(screen.getByText("加载中")).toBeInTheDocument();
  });

  it("无匹配结果时展示空态文案", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    await user.type(screen.getByRole("searchbox", { name: "搜索文章" }), "不存在");

    expect(screen.getByText("暂无文章")).toBeInTheDocument();
  });
});
