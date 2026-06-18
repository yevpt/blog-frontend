# DataTable 组件设计

## 背景

当前 `packages/ui/src/table` 暴露的是偏底层的 `Table / TableHeader / Column / Row / Cell` 组合。它有 React Aria 的无障碍基础，但排序、过滤、搜索等表格产品能力需要业务页自己拼表头控件和状态逻辑，导致组件库没有承担应有的交互标准。

新版以组件库标准为目标：业务方只使用 `DataTable`，通过列配置声明表格行为；排序、过滤、搜索、空态、加载态等通用交互由组件内部统一实现。

## 对外边界

`@repo/ui` 对外只导出：

- `DataTable`
- `type DataTableProps`
- `type DataTableColumn`
- `type DataTableState`
- `type DataTableSort`
- `type DataTableFilter`
- `type DataTableSearch`

不再从包入口导出 `Table / TableHeader / TableBody / Column / Row / Cell`。如果实现上仍需要这些低层组件，它们只作为 `packages/ui/src/table` 内部细节存在，不面向业务代码。

## 推荐用法

业务页使用 `items + columns` 描述表格：

```tsx
<DataTable
  aria-label="文章列表"
  items={articles}
  columns={articleColumns}
  getRowId={(article) => article.id}
  search={{
    value: searchValue,
    onChange: setSearchValue,
    placeholder: "搜索标题、摘要或作者",
    match: (article, keyword) =>
      [article.title, article.excerpt, article.category, ...article.tags]
        .join(" ")
        .toLowerCase()
        .includes(keyword.toLowerCase()),
  }}
  state={tableState}
  onStateChange={setTableState}
/>
```

列配置承担表头交互：

```tsx
const articleColumns: Array<DataTableColumn<ArticleRow>> = [
  {
    id: "title",
    header: "标题",
    isRowHeader: true,
    width: 430,
    cell: (article) => <ArticleTitle article={article} />,
  },
  {
    id: "status",
    header: "状态",
    width: 120,
    cell: (article) => <ArticleStatusBadge status={article.status} />,
    filter: {
      type: "single",
      defaultValue: "all",
      options: statusFilterOptions,
      match: (article, value) => value === "all" || article.status === value,
    },
  },
  {
    id: "updatedAt",
    header: "更新时间",
    width: 130,
    cell: (article) => article.updatedAt,
    sort: {
      defaultDirection: "descending",
      value: (article) => article.updatedAt,
    },
  },
];
```

## API 形状

`DataTableProps<T>`：

- `items: T[]`
- `columns: Array<DataTableColumn<T>>`
- `getRowId: (item: T) => string`
- `aria-label` 或 `aria-labelledby`
- `state?: DataTableState`
- `defaultState?: DataTableState`
- `onStateChange?: (state: DataTableState) => void`
- `search?: DataTableSearch<T>`
- `emptyText?: ReactNode`
- `loadingText?: ReactNode`
- `isLoading?: boolean`
- `className?: string`
- `maxHeightClassName?: string | false`

`DataTableColumn<T>`：

- `id: string`
- `header: ReactNode`
- `cell: (item: T) => ReactNode`
- `width?: number`
- `minWidth?: number`
- `className?: string`
- `headerClassName?: string`
- `isRowHeader?: boolean`
- `sort?: boolean | DataTableSort<T>`
- `filter?: DataTableFilter<T>`

`DataTableState`：

- `sort?: { column: string; direction: "ascending" | "descending" }`
- `filters: Record<string, string | string[]>`
- `searchValue: string`

## 状态模式

组件支持两种模式：

- 非受控：传 `defaultState` 或只传列配置，组件内部处理搜索、过滤、排序后的 `items`。
- 受控：传 `state/onStateChange`，组件负责渲染 UI 和发出变更。默认仍可本地派生 visible items；未来接服务端接口时，业务方可以在 `onStateChange` 中请求数据，并传入服务端返回的 `items`。

第一版不加入分页和虚拟滚动，避免 API 过早膨胀。分页后续可作为 `pagination` 配置加入，并复用现有 `Pagination` 组件。

## 交互

- 搜索栏位于表格上方，使用现有 `SearchField`。
- 可排序列在表头展示方向图标，点击切换升序/降序。
- 可过滤列在表头展示下拉按钮，使用现有 `Dropdown`。
- 单选过滤第一版支持 `type: "single"`；多选过滤保留类型扩展点但不急着实现。
- 空数据展示 `emptyText`，默认文案为 `暂无数据`。
- 加载时展示 `loadingText`，默认文案为 `加载中`。
- 表头按钮必须有明确 `aria-label`，排序列同步 `aria-sort`。

## 视觉

保持现有后台工具型风格：紧凑、克制、可扫描。表头使用语义色 `bg-muted/text-muted-foreground/border-border`，行 hover、selected、focus-visible 延续当前 `Table` 的设计令牌，不引入硬编码颜色。

## 迁移范围

- 重构 `packages/ui/src/table/table.tsx` 为 `DataTable` 主实现。
- 更新 `packages/ui/src/index.ts`，只导出 `DataTable` 与相关类型。
- 删除或停止导出 `Table / TableHeader / TableBody / Column / Row / Cell`。
- 将 `apps/admin/src/pages/ArticlesPage.tsx` 迁移到新 `DataTable` API。
- 删除业务页自定义的 `ArticleTableHeaderControls`，把筛选/排序配置放入列定义。

## 测试

`packages/ui/src/table/table.test.tsx` 覆盖：

- 基础渲染：列头、行、单元格。
- 搜索：输入关键字后只显示匹配行。
- 排序：点击排序表头切换方向并重排行。
- 过滤：选择过滤项后只显示匹配行。
- 受控状态：点击表头/选择过滤项会调用 `onStateChange`。
- 空态与加载态。

`apps/admin/src/pages/ArticlesPage.test.tsx` 覆盖：

- 页面能渲染文章表格。
- 搜索、状态过滤、更新时间排序可用。

## 风险

- 这是破坏性变更，所有旧的低层表格导入都需要迁移。
- `DataTableColumn<T>` 的类型需要保持清晰，否则业务侧会难以推断 `cell/filter/sort` 的泛型。
- 过滤下拉依赖 `Dropdown` 当前样式，若它仍有非语义色残留，本次只在表格使用处用 className 收敛，不顺手大改 Dropdown。
