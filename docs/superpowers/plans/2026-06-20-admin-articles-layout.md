# Admin Articles Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin articles list page as a compact command-bar layout with a 24px title, external filter/search row, and table-internal scrolling.

**Architecture:** Keep article-specific UI in `apps/admin/src/modules/articles/`. Make one small shared `DataTable` fix so pages can use the table without its built-in toolbar. Preserve existing API behavior: category/search/sort/page are real server-backed controls; status chips are not implemented until the API exposes a status filter.

**Tech Stack:** React 19, TypeScript, React Router, React Aria Components via `@repo/ui`, TailwindCSS, Vitest + Testing Library.

---

## File Structure

- Modify `packages/ui/src/table/table.tsx`: skip rendering `DataTableToolbar` when no toolbar content exists.
- Modify `packages/ui/src/table/table.test.tsx`: cover the no-toolbar case.
- Create `apps/admin/src/modules/articles/components/ArticleListSearch.tsx`: article-page expandable search control.
- Create `apps/admin/src/modules/articles/components/ArticleListSearch.test.tsx`: search expand/collapse behavior.
- Modify `apps/admin/src/modules/articles/ArticlesPage.tsx`: compact page header, filter row, external search, table fill layout.
- Modify `apps/admin/src/modules/articles/ArticlesPage.test.tsx`: expected UI changes and retained interactions.

---

### Task 1: Let DataTable Omit An Empty Toolbar

**Files:**

- Modify: `packages/ui/src/table/table.tsx`
- Test: `packages/ui/src/table/table.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test in `packages/ui/src/table/table.test.tsx` after the existing actions-toolbar test:

```tsx
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
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter @repo/ui test -- table.test.tsx
```

Expected: FAIL because the root still has toolbar + table container children.

- [ ] **Step 3: Implement the minimal shared fix**

In `packages/ui/src/table/table.tsx`, compute whether toolbar content exists and render `DataTableToolbar` only then:

```tsx
  const hasToolbar = Boolean(search) || Boolean(actions) || showTotal;

  return (
    <div
      aria-busy={isLoading || undefined}
      className={cn("grid gap-3", classNames?.root, className)}
    >
      {hasToolbar ? (
        <DataTableToolbar
          search={search}
          searchValue={table.tableState.searchValue}
          total={total ?? table.visibleItems.length}
          showTotal={showTotal}
          actions={actions}
          onSearchChange={table.onSearchChange}
          classNames={classNames}
        />
      ) : null}

      <DataTableView
```

- [ ] **Step 4: Run the focused table tests**

Run:

```bash
pnpm --filter @repo/ui test -- table.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/table/table.tsx packages/ui/src/table/table.test.tsx
git commit -m "fix(ui): 允许表格隐藏空工具栏"
```

---

### Task 2: Add Expandable Article Search

**Files:**

- Create: `apps/admin/src/modules/articles/components/ArticleListSearch.tsx`
- Create: `apps/admin/src/modules/articles/components/ArticleListSearch.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `apps/admin/src/modules/articles/components/ArticleListSearch.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleListSearch } from "./ArticleListSearch";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

describe("ArticleListSearch", () => {
  it("默认只显示搜索按钮，点击后展开输入框并聚焦", async () => {
    const user = userEvent.setup();
    render(<ArticleListSearch value="" onChange={vi.fn()} />);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开搜索" }));

    const input = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
    expect(input).toHaveFocus();
  });

  it("输入内容时调用 onChange，且有值时直接保持展开", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ArticleListSearch value="Vite" onChange={onChange} />);

    const input = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
    await user.type(input, " 管理后台");

    expect(onChange).toHaveBeenCalled();
  });

  it("空值输入框失焦后收起为搜索按钮", async () => {
    const user = userEvent.setup();
    render(<ArticleListSearch value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "展开搜索" }));
    await user.tab();

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开搜索" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter admin test -- ArticleListSearch.test.tsx
```

Expected: FAIL because `ArticleListSearch` does not exist.

- [ ] **Step 3: Implement the component**

Create `apps/admin/src/modules/articles/components/ArticleListSearch.tsx`:

```tsx
import { useEffect, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, SearchField } from "@repo/ui";

interface ArticleListSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ArticleListSearch({
  value,
  onChange,
  placeholder = "搜索标题或摘要",
}: ArticleListSearchProps) {
  const [isExpanded, setIsExpanded] = useState(value.trim().length > 0);

  useEffect(() => {
    if (value.trim().length > 0) setIsExpanded(true);
  }, [value]);

  if (!isExpanded) {
    return (
      <Button
        type="button"
        variant="outline"
        aria-label="展开搜索"
        onPress={() => setIsExpanded(true)}
        className="size-8 rounded-full border-border bg-background p-0 shadow-sm"
      >
        <SvgIcon name="search" size={15} />
      </Button>
    );
  }

  return (
    <SearchField
      autoFocus
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={() => {
        if (value.trim().length === 0) setIsExpanded(false);
      }}
      className="w-full sm:w-[300px]"
      inputClassName="px-2"
      clearLabel="清除搜索"
      size="sm"
    />
  );
}
```

- [ ] **Step 4: Run the focused component test**

Run:

```bash
pnpm --filter admin test -- ArticleListSearch.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/modules/articles/components/ArticleListSearch.tsx apps/admin/src/modules/articles/components/ArticleListSearch.test.tsx
git commit -m "feat(admin): 新增文章列表展开搜索"
```

---

### Task 3: Rebuild ArticlesPage Layout

**Files:**

- Modify: `apps/admin/src/modules/articles/ArticlesPage.tsx`
- Modify: `apps/admin/src/modules/articles/ArticlesPage.test.tsx`

- [ ] **Step 1: Update page tests for the new layout**

In `ArticlesPage.test.tsx`, update the main render test expectations:

```tsx
expect(screen.getByRole("heading", { name: "文章管理" })).toBeInTheDocument();
expect(
  screen.queryByText("集中查看文章、按表头筛选排序，并从标题直接进入编辑页面。"),
).not.toBeInTheDocument();
expect(screen.queryByRole("link", { name: "置顶管理" })).not.toBeInTheDocument();
expect(screen.getByRole("link", { name: "新建" })).toHaveAttribute("href", "/articles/new");
expect(screen.getByText("全部 42")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "筛选分类" })).toBeInTheDocument();
expect(screen.queryByRole("button", { name: "更多筛选" })).not.toBeInTheDocument();
```

Replace the existing search test with:

```tsx
it("展开搜索后将输入交给服务端查询", async () => {
  const user = userEvent.setup();
  renderArticlesPage();

  await user.click(screen.getByRole("button", { name: "展开搜索" }));
  const searchbox = screen.getByRole("searchbox", { name: "搜索标题或摘要" });
  await user.type(searchbox, "Vite");

  expect(mockSetSearch).toHaveBeenCalled();
  expect(mockSetSearch.mock.calls.some(([value]) => String(value).includes("Vite"))).toBe(true);
});
```

Update the category test to target the external Select:

```tsx
it("分类筛选变更时调用 setCategoryId", async () => {
  const user = userEvent.setup();
  renderArticlesPage();

  await user.click(screen.getByRole("button", { name: "筛选分类" }));
  await user.click(screen.getByRole("option", { name: "前端" }));

  expect(mockSetCategoryId).toHaveBeenCalledWith("2");
});
```

Keep the existing sort, pagination, and delete tests.

- [ ] **Step 2: Run the focused page test and verify it fails**

Run:

```bash
pnpm --filter admin test -- ArticlesPage.test.tsx
```

Expected: FAIL because the old title block, search placement, and `置顶管理` button are still present.

- [ ] **Step 3: Implement the compact layout**

In `ArticlesPage.tsx`:

- Import `ArticleListSearch`.
- Remove `toolbarActions`.
- Remove the icon block and description paragraph.
- Remove the `href="/articles/pinned"` button.
- Move search outside `DataTable`.
- Move category filtering out of the table header into a real `Select` in the filter row.
- Do not add status filters yet.

Use this layout skeleton:

```tsx
return (
  <div className="grid h-[calc(100dvh-6.5rem)] min-h-0 grid-rows-[64px_auto_minmax(0,1fr)] overflow-hidden lg:h-[calc(100dvh-3rem)]">
    <section className="flex min-w-0 items-center justify-between gap-3">
      <h2 className="truncate text-2xl font-semibold tracking-normal text-foreground">文章管理</h2>
      <Button href="/articles/new" size="sm" className="shrink-0">
        <SvgIcon name="plus" size={15} />
        新建
      </Button>
    </section>

    <section
      className="flex min-w-0 flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="文章列表筛选"
    >
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
        <Badge variant="secondary" className="shrink-0 rounded-full px-3 py-1">
          全部 {pageData?.total ?? 0}
        </Badge>
        <Select
          aria-label="筛选分类"
          selectedKey={filters.categoryId}
          onSelectionChange={(key) => setCategoryId(String(key))}
          items={categorySelectItems}
          size="sm"
          className="w-[132px] shrink-0"
          popoverClassName="w-44"
        >
          {(item) => <Select.Item id={item.id} label={item.label} />}
        </Select>
      </div>

      <div className="flex justify-end">
        <ArticleListSearch value={filters.search} onChange={setSearch} />
      </div>
    </section>

    <section className="grid min-h-0 gap-3 pt-3" aria-label="文章列表工具栏">
      {listError ? (
        <p role="alert" className="text-sm text-destructive">
          {listError.message}
        </p>
      ) : null}

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
        <DataTable
          aria-label="文章列表"
          items={rows}
          columns={columns}
          getRowId={(article) => article.id}
          showTotal={false}
          state={{
            searchValue: filters.search,
            filters: {
              category: filters.categoryId,
            },
            sort,
          }}
          onStateChange={handleTableStateChange}
          total={pageData?.total}
          emptyText="暂无文章"
          isLoading={isLoading || isLoadingFilterOptions}
          maxHeightClassName={false}
          classNames={{
            root: "min-h-0 h-full",
            container: "min-h-0 h-full shadow-sm",
          }}
        />

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">共 {pageData?.total ?? 0} 条</p>
          {pageData && pageData.pages > 1 ? (
            <Pagination
              currentPage={page}
              totalPages={pageData.pages}
              onPageChange={setPage}
              className="justify-end"
            />
          ) : null}
        </div>
      </div>
    </section>
  </div>
);
```

Add the select items near the columns:

```tsx
const categorySelectItems = useMemo(
  () => categoryOptions.map((option) => ({ id: option.value, label: option.label })),
  [categoryOptions],
);
```

Remove the `filter` property from the `category` column because category filtering is now owned by the filter row.

- [ ] **Step 4: Run the focused page test**

Run:

```bash
pnpm --filter admin test -- ArticlesPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/modules/articles/ArticlesPage.tsx apps/admin/src/modules/articles/ArticlesPage.test.tsx
git commit -m "refactor(admin): 优化文章管理页布局"
```

---

### Task 4: Verify The Whole Change

**Files:**

- No planned source edits. Fix only failures caused by the previous tasks.

- [ ] **Step 1: Run affected package tests**

Run:

```bash
pnpm --filter @repo/ui test -- table.test.tsx
pnpm --filter admin test -- ArticleListSearch.test.tsx ArticlesPage.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run typecheck and lint**

Run:

```bash
pnpm -r --if-present check-types
pnpm -r --if-present lint
```

Expected: PASS.

- [ ] **Step 3: Start admin dev server for visual QA**

Run:

```bash
pnpm --filter admin dev
```

Expected: Vite serves admin, usually at `http://localhost:5173`.

- [ ] **Step 4: Inspect the articles page**

Open `/articles` in the browser and verify:

- The title is visually closer to the chosen B scale: 24px, 64px header row.
- No description copy appears under the title.
- `置顶管理` is gone.
- `新建` is smaller and links to `/articles/new`.
- The search icon expands left into a pill search field.
- The page itself does not scroll on desktop; the table body scrolls inside its container.
- Mobile/narrow width does not overlap title, filters, search, table, or pagination.

- [ ] **Step 5: Commit any verification fixes**

Only if Step 4 required fixes:

```bash
git add <changed-files>
git commit -m "fix(admin): 修正文章页布局细节"
```

---

## Self-Review

- Spec coverage: The plan covers title scale, description removal, removed pinned-management button, smaller new button, expandable search, filter row, and table-internal scrolling.
- API honesty: Status chips and `更多筛选` are not implemented because `ArticleListReq` has no `status` parameter and there is no additional real filter yet. The first implementation keeps only real filters.
- Test coverage: Shared table behavior, new search component, and articles page behavior all get focused tests before implementation.
