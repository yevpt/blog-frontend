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
  items?: ArticleRow[];
  skeletonRows?: number;
}) {
  const { items = rows, ...rest } = props ?? {};
  return render(
    <DataTable
      aria-label="文章"
      items={items}
      columns={columns}
      getRowId={(article) => article.id}
      search={{
        placeholder: "搜索文章",
        match: (article, keyword) =>
          [article.title, article.category].join(" ").toLowerCase().includes(keyword.toLowerCase()),
      }}
      emptyText="暂无文章"
      loadingText="加载中"
      {...rest}
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

  it("渲染工具栏 actions 操作区，showTotal=false 时隐藏总数", () => {
    render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        showTotal={false}
        actions={<button type="button">新建文章</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "新建文章" })).toBeInTheDocument();
    expect(screen.queryByText("共 3 条")).not.toBeInTheDocument();
  });

  it("没有搜索、操作和总数时不渲染空工具栏", () => {
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        showTotal={false}
      />,
    );

    const root = container.firstElementChild;
    expect(root?.children).toHaveLength(1);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByText("共 3 条")).not.toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "文章" })).toBeInTheDocument();
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

  it("滚动容器不在内部控件聚焦时显示浏览器焦点边框", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        search={{
          placeholder: "搜索文章",
          match: (article, keyword) =>
            [article.title, article.category]
              .join(" ")
              .toLowerCase()
              .includes(keyword.toLowerCase()),
        }}
        classNames={{ container: "table-scroll-container" }}
      />,
    );

    await user.click(screen.getByRole("searchbox", { name: "搜索文章" }));

    const scrollContainer = container.querySelector<HTMLElement>(".table-scroll-container");

    expect(scrollContainer).toHaveClass("outline-none");
    expect(scrollContainer).toHaveClass("focus-visible:outline-none");
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
      screen.getByRole("button", { name: "更新时间排序：升序，点击取消排序" }),
    ).not.toHaveAttribute("aria-pressed");
    expect(getArticleLinks()[0]).toHaveTextContent("旧友链清理记录");
  });

  it("点击同一列排序按钮按降序、升序、未排序循环", async () => {
    const user = userEvent.setup();

    function StatefulArticleTable() {
      const [state, setState] = React.useState<DataTableState>({
        searchValue: "",
        filters: { status: "all" },
        sort: undefined,
      });

      return (
        <DataTable
          aria-label="文章"
          items={rows}
          columns={columns}
          getRowId={(article) => article.id}
          state={state}
          onStateChange={setState}
          search={{
            placeholder: "搜索文章",
            match: (article, keyword) =>
              [article.title, article.category]
                .join(" ")
                .toLowerCase()
                .includes(keyword.toLowerCase()),
          }}
        />
      );
    }

    render(<StatefulArticleTable />);

    await user.click(screen.getByRole("button", { name: "更新时间排序：未排序，点击排序" }));

    expect(getArticleLinks()[0]).toHaveTextContent("React Query 与后台表格状态");
    expect(
      screen.getByRole("button", { name: "更新时间排序：降序，点击切换为升序" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "更新时间排序：降序，点击切换为升序" }));

    expect(getArticleLinks()[0]).toHaveTextContent("旧友链清理记录");
    expect(
      screen.getByRole("button", { name: "更新时间排序：升序，点击取消排序" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "更新时间排序：升序，点击取消排序" }));

    expect(getArticleLinks()[0]).toHaveTextContent("React Query 与后台表格状态");
    expect(
      screen.getByRole("button", { name: "更新时间排序：未排序，点击排序" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /更新时间/ })).not.toHaveAttribute("aria-sort");
  });

  it("点击筛选按钮不会触发表头排序", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    await user.click(screen.getByRole("button", { name: "筛选状态" }));

    expect(getArticleLinks()[0]).toHaveTextContent("React Query 与后台表格状态");
  });

  it("表头操作区渲染在最右侧，点击不冒泡触发排序，并支持 slot className 定制", async () => {
    const user = userEvent.setup();
    const columnsWithHeaderAction = columns.map((column) =>
      column.id === "updatedAt"
        ? { ...column, headerAction: <button type="button">列内搜索</button> }
        : column,
    );

    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columnsWithHeaderAction}
        getRowId={(article) => article.id}
        classNames={{ headerAction: "table-header-action" }}
      />,
    );

    expect(container.querySelector(".table-header-action")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "列内搜索" }));

    expect(getArticleLinks()[0]).toHaveTextContent("React Query 与后台表格状态");
  });

  it("表头操作区隔离键盘事件，避免输入框按键冒泡到表格焦点管理", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    const columnsWithHeaderAction = columns.map((column) =>
      column.id === "title"
        ? {
            ...column,
            headerAction: <input aria-label="列内搜索" />,
          }
        : column,
    );

    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onKeyDown={onKeyDown}>
        <DataTable
          aria-label="文章"
          items={rows}
          columns={columnsWithHeaderAction}
          getRowId={(article) => article.id}
        />
      </div>,
    );

    const input = screen.getByRole("textbox", { name: "列内搜索" });

    await user.type(input, "Vite");

    expect(onKeyDown).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
    expect(input).toHaveValue("Vite");
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
      name: "更新时间排序：升序，点击取消排序",
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

  it("接受 fr 弹性列宽并正常渲染（吸收容器剩余宽度）", () => {
    const flexColumns: Array<DataTableColumn<ArticleRow>> = [
      {
        id: "title",
        header: "标题",
        isRowHeader: true,
        // 弹性列：固定列之和小于容器时撑满剩余宽度
        width: "1fr",
        minWidth: 320,
        cell: (article) => article.title,
      },
      { id: "status", header: "状态", width: 120, cell: (article) => statusLabel[article.status] },
    ];

    render(
      <DataTable
        aria-label="弹性列文章"
        items={rows}
        columns={flexColumns}
        getRowId={(article) => article.id}
      />,
    );

    const grid = screen.getByRole("grid", { name: "弹性列文章" });
    expect(within(grid).getByRole("columnheader", { name: /标题/ })).toBeInTheDocument();
    expect(
      within(grid).getByRole("rowheader", { name: "React Query 与后台表格状态" }),
    ).toBeInTheDocument();
  });

  it("已有数据加载时叠加覆盖层并保留旧行", () => {
    const { container } = renderArticleTable({ isLoading: true });

    const grid = screen.getByRole("grid", { name: "文章" });
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    // 旧数据仍然可见
    expect(
      within(grid).getByRole("rowheader", { name: "React Query 与后台表格状态" }),
    ).toBeInTheDocument();
    // 覆盖层 spinner 与文案
    expect(screen.getByRole("progressbar", { name: "加载中" })).toBeInTheDocument();
    expect(screen.getByText("加载中")).toBeInTheDocument();
  });

  it("已有数据加载时遮罩覆盖滚动视口而不是滚动内容", () => {
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        isLoading
        classNames={{
          container: "table-scroll-container",
          overlay: "table-loading-overlay",
        }}
      />,
    );

    const scrollContainer = container.querySelector<HTMLElement>(".table-scroll-container");
    const overlay = container.querySelector<HTMLElement>(".table-loading-overlay");

    expect(scrollContainer).toBeInTheDocument();
    expect(overlay).toBeInTheDocument();
    expect(scrollContainer).not.toContainElement(overlay);
  });

  it("加载遮罩不使用 backdrop blur，避免分页时触发大面积重绘", () => {
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        isLoading
        classNames={{ overlay: "table-loading-overlay" }}
      />,
    );

    const overlay = container.querySelector<HTMLElement>(".table-loading-overlay");

    expect(overlay).toBeInTheDocument();
    expect(overlay?.className).not.toContain("backdrop-blur");
  });

  it("加载遮罩层级低于 sticky 表头，避免表头随加载态闪烁", () => {
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        isLoading
        classNames={{
          header: "table-sticky-header",
          overlay: "table-loading-overlay",
        }}
      />,
    );

    const header = container.querySelector<HTMLElement>(".table-sticky-header");
    const overlay = container.querySelector<HTMLElement>(".table-loading-overlay");

    expect(header).toHaveClass("z-30");
    expect(overlay).toHaveClass("z-20");
  });

  it("加载刷新期间上游短暂清空数据时保留上一帧行并只显示覆盖层", () => {
    const { container, rerender } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        loadingText="加载中"
      />,
    );

    rerender(
      <DataTable
        aria-label="文章"
        items={[]}
        columns={columns}
        getRowId={(article) => article.id}
        isLoading
        loadingText="加载中"
      />,
    );

    const grid = screen.getByRole("grid", { name: "文章" });
    expect(
      within(grid).getByRole("rowheader", { name: "React Query 与后台表格状态" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "加载中" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-skeleton-bar]")).toHaveLength(0);
  });

  it("遮罩外层保留表格在弹性布局中的横向滚动与满高约束", () => {
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        maxHeightClassName={false}
        classNames={{
          container: "min-h-0 h-full table-scroll-container",
        }}
      />,
    );

    const scrollContainer = container.querySelector<HTMLElement>(".table-scroll-container");
    const viewportWrapper = scrollContainer?.parentElement;

    expect(viewportWrapper).toHaveClass("min-w-0");
    expect(viewportWrapper).toHaveClass("min-h-0");
    expect(viewportWrapper).toHaveClass("h-full");
    expect(scrollContainer).toHaveClass("min-h-0");
    expect(scrollContainer).toHaveClass("h-full");
  });

  it("移动端横向滚动被限制在表格容器内", () => {
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={rows}
        columns={columns}
        getRowId={(article) => article.id}
        classNames={{ container: "table-scroll-container" }}
      />,
    );

    const scrollContainer = container.querySelector<HTMLElement>(".table-scroll-container");
    const clippingWrapper = scrollContainer?.parentElement;

    expect(clippingWrapper).toHaveClass("overflow-hidden");
    expect(clippingWrapper).toHaveClass("rounded-lg");
    expect(clippingWrapper).toHaveClass("[contain:paint]");
    expect(scrollContainer).toHaveClass("overflow-auto");
    expect(scrollContainer).toHaveClass("overscroll-none");
    expect(scrollContainer).toHaveClass("touch-pan-x");
    expect(scrollContainer).toHaveClass("touch-pan-y");
    expect(scrollContainer).toHaveClass("[-webkit-overflow-scrolling:auto]");
    expect(screen.getByRole("grid", { name: "文章" })).toHaveStyle({ minWidth: "670px" });
  });

  it("首屏无数据加载时渲染骨架占位行而非空态文案", () => {
    const { container } = renderArticleTable({ items: [], isLoading: true, skeletonRows: 4 });

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    // 4 行 × 4 列骨架灰条
    expect(container.querySelectorAll("[data-skeleton-bar]")).toHaveLength(16);
    // 加载中不显示空态文案
    expect(screen.queryByText("暂无文章")).not.toBeInTheDocument();
  });

  it("非加载且无数据时展示空态文案", () => {
    renderArticleTable({ items: [] });

    expect(screen.getByText("暂无文章")).toBeInTheDocument();
  });

  it("非加载且无数据时支持友好的空态面板", () => {
    const { container } = render(
      <DataTable
        aria-label="文章"
        items={[]}
        columns={columns}
        getRowId={(article) => article.id}
        emptyState={{
          icon: "folder",
          title: "未找到匹配的文章",
          description: "调整搜索或筛选条件后再试。",
        }}
        classNames={{ emptyState: "table-empty-state" }}
      />,
    );

    const emptyState = container.querySelector<HTMLElement>(".table-empty-state");

    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveClass("min-h-[220px]");
    expect(within(emptyState as HTMLElement).getByTestId("icon-folder")).toBeInTheDocument();
    expect(screen.getByText("未找到匹配的文章")).toBeInTheDocument();
    expect(screen.getByText("调整搜索或筛选条件后再试。")).toBeInTheDocument();
  });

  it("无匹配结果时展示空态文案", async () => {
    const user = userEvent.setup();
    renderArticleTable();

    await user.type(screen.getByRole("searchbox", { name: "搜索文章" }), "不存在");

    expect(screen.getByText("暂无文章")).toBeInTheDocument();
  });
});
