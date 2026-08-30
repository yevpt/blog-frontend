# DataTable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a component-library-grade `DataTable` as the only public table API from `@repo/ui`.

**Architecture:** Split the table into type definitions, state derivation helpers, header controls, and the main `DataTable` shell. Keep React Aria as the accessible table foundation, but hide primitive `Table / Column / Row / Cell` exports from app code.

**Tech Stack:** React 19, TypeScript, TailwindCSS, React Aria Components, Vitest, Testing Library.

---

## File Structure

- Create `packages/ui/src/table/types.ts`: public `DataTable` types.
- Create `packages/ui/src/table/table-state.ts`: pure helpers for state normalization, filtering, searching, and sorting.
- Create `packages/ui/src/table/table-header-cell.tsx`: sort and filter header UI.
- Modify `packages/ui/src/table/table.tsx`: main `DataTable` implementation and internal table primitives.
- Modify `packages/ui/src/table/table.test.tsx`: behavior tests for rendering, search, filter, sort, controlled state, loading, and empty state.
- Modify `packages/ui/src/index.ts`: export only `DataTable` and related types.
- Modify `apps/admin/src/pages/ArticlesPage.tsx`: migrate article table to `DataTable`.
- Modify `apps/admin/src/pages/ArticlesPage.test.tsx`: update tests to the new standardized header controls.
- Delete `apps/admin/src/pages/ArticleTableHeaderControls.tsx`: no app-specific table header controls.

## Task 1: DataTable Public Behavior Tests

**Files:**

- Modify: `packages/ui/src/table/table.test.tsx`

- [ ] **Step 1: Replace primitive table tests with DataTable behavior tests**

Cover this API shape:

```tsx
<DataTable
  aria-label="文章"
  items={rows}
  columns={columns}
  getRowId={(row) => row.id}
  search={{
    placeholder: "搜索文章",
    match: (row, keyword) => row.title.toLowerCase().includes(keyword.toLowerCase()),
  }}
  emptyText="暂无文章"
/>
```

Tests must assert:

- `DataTable` renders a `grid` with headers and rows.
- Search filters visible rows.
- A single-select filter filters visible rows and updates the trigger label.
- Clicking a sortable header toggles direction and reorders rows.
- Controlled `state/onStateChange` receives the next sort/filter/search state.
- `isLoading` renders loading text.
- Empty result renders `emptyText`.

- [ ] **Step 2: Run the UI test file and confirm RED**

Run:

```bash
pnpm --filter @repo/ui test src/table/table.test.tsx
```

Expected: fails because `DataTable` and the new exports do not exist yet.

## Task 2: DataTable Core Implementation

**Files:**

- Create: `packages/ui/src/table/types.ts`
- Create: `packages/ui/src/table/table-state.ts`
- Create: `packages/ui/src/table/table-header-cell.tsx`
- Modify: `packages/ui/src/table/table.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Add public types**

Define:

- `DataTableSortDirection = "ascending" | "descending"`
- `DataTableState`
- `DataTableOption`
- `DataTableSearch<T>`
- `DataTableSort<T>`
- `DataTableFilter<T>`
- `DataTableColumn<T>`
- `DataTableProps<T>`

Use precise types and no `any`.

- [ ] **Step 2: Add pure state helpers**

Implement:

- `getDefaultTableState(columns, search)`
- `mergeTableState(base, patch)`
- `getNextSort(current, column)`
- `getFilteredSortedRows(items, columns, state, search)`

Keep these pure and independently testable through `DataTable` behavior.

- [ ] **Step 3: Add header controls**

Implement `DataTableHeaderCell` with:

- label text
- optional sort button
- optional single filter dropdown
- semantic icon buttons using `ButtonUtility`, `Dropdown`, and `SvgIcon`
- active filter label such as `筛选状态：草稿`

- [ ] **Step 4: Implement DataTable**

Render:

- optional toolbar with `SearchField` and result count
- accessible React Aria table
- internal rows from `getFilteredSortedRows`
- loading and empty states

Support both controlled and uncontrolled state.

- [ ] **Step 5: Export only DataTable public API**

Update `packages/ui/src/index.ts` so table exports are:

```ts
export {
  DataTable,
  type DataTableProps,
  type DataTableColumn,
  type DataTableState,
  type DataTableSort,
  type DataTableFilter,
  type DataTableSearch,
} from "./table/table";
```

No `Table`, `Column`, `Row`, or `Cell` export remains.

- [ ] **Step 6: Run UI tests and confirm GREEN**

Run:

```bash
pnpm --filter @repo/ui test src/table/table.test.tsx
```

Expected: passes.

## Task 3: Admin Articles Migration

**Files:**

- Modify: `apps/admin/src/pages/ArticlesPage.tsx`
- Modify: `apps/admin/src/pages/ArticlesPage.test.tsx`
- Delete: `apps/admin/src/pages/ArticleTableHeaderControls.tsx`

- [ ] **Step 1: Update admin tests for the new DataTable controls**

Assert:

- page renders the table and action links
- search filters article rows
- status filter uses `筛选状态`
- updated time sort uses `更新时间排序`

- [ ] **Step 2: Run admin page tests and confirm RED**

Run:

```bash
pnpm --filter admin test src/pages/ArticlesPage.test.tsx
```

Expected: fails until `ArticlesPage` uses `DataTable`.

- [ ] **Step 3: Migrate ArticlesPage**

Replace manual `Table` composition and app-specific header controls with a memoized `DataTableColumn<ArticleRow>[]`.

Remove:

- `FilterHeader`
- `SortHeader`
- local `filters`
- local `sortDirection`
- `filterAndSortArticles` usage

Keep:

- page heading/actions
- article title link cell
- status badge
- delete button cell

- [ ] **Step 4: Delete obsolete app header controls**

Remove `apps/admin/src/pages/ArticleTableHeaderControls.tsx` after imports are gone.

- [ ] **Step 5: Run admin page tests and confirm GREEN**

Run:

```bash
pnpm --filter admin test src/pages/ArticlesPage.test.tsx
```

Expected: passes.

## Task 4: Final Verification

**Files:**

- Verify all modified files.

- [ ] **Step 1: Run targeted UI tests**

```bash
pnpm --filter @repo/ui test src/table/table.test.tsx
```

- [ ] **Step 2: Run targeted admin tests**

```bash
pnpm --filter admin test src/pages/ArticlesPage.test.tsx
```

- [ ] **Step 3: Run typecheck for affected packages**

```bash
pnpm --filter @repo/ui check-types
pnpm --filter admin check-types
```

- [ ] **Step 4: Run lint for affected packages**

```bash
pnpm --filter @repo/ui lint
pnpm --filter admin lint
```

- [ ] **Step 5: Inspect public exports**

Run:

```bash
rg "TableHeader|TableBody|Column,|Row,|Cell," packages/ui/src/index.ts apps/admin/src -g "*.ts" -g "*.tsx"
```

Expected: no app imports of the primitive table API.
