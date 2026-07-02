---
name: "building-ui"
description: "Use when writing or editing any UI in this monorepo — JSX/TSX markup, Tailwind classes, page.tsx, or React components in apps/web, apps/admin, or packages/ui. Provides the reuse-first component inventory, package UI component-library standards, icon/style/data-fetch rules, and concrete anti-patterns from the refactor backlog. Trigger before reaching for a raw <button>, <input>, <svg>, fetch(), or a custom Tailwind widget."
license: "MIT"
---

# 写页面 / UI 的规范

本仓库已有成套共享组件、Hook、类型化 client。**几乎没有理由从零手写基础 UI。**
（通用 TS 风格与测试要求见 `AGENTS.md`，本文件只讲写 UI 的场景。）

## 第一原则：复用优先

落每个 UI 元素前先问：`@repo/*` 是否已有它？
- 有 → 直接 import，用 `className` 透传微调，不写平行实现。
- 不确定 → 读包入口确认（`packages/ui/src/index.ts`、`packages/hooks/src/index.ts`、`packages/api/src/index.ts`），别凭印象。
- 确实没有 → 是「基础通用 UI」就在 `packages/ui` 新建并导出再用；是业务组件才写进 app 的 `components/`。

> 为什么：app 里手写 `<button>`/`<input>` 会绕过统一的 a11y、主题、响应式，制造下一轮重构债。

## `packages/ui` 组件库封装标准

新增或修改 `packages/ui/src/*` 里的通用组件时，按组件库标准处理，而不是按业务组件临时实现：

- **Public API 边界**：组件目录优先提供 `index.ts` 作为组件级 public barrel；根 `packages/ui/src/index.ts` 从组件目录导出。实现文件只做实现，不兼任类型聚合。外部只暴露用户应消费的组件与类型，不导出内部视图/按钮/Hook。
- **目录结构**：复杂组件使用 `internal/` 放私有 DOM 子组件，`hooks/` 放状态 Hook，`utils/` 放纯函数，`types.ts` 放公共类型。内部文件名避免重复目录语义，例如在 `table/internal/` 里用 `header.tsx`、`body.tsx`、`view.tsx`，不再写 `table-header.tsx`。
- **入口简洁**：主组件文件只展示 props 解构、Hook 调用和高层 DOM 组合。筛选、排序、弹窗、渲染循环、状态计算等细节下沉到子组件、Hook 或 utils。
- **类型设计**：禁止 `any`。公共 props、配置项、状态类型都要精确导出；内部 props 用命名 interface。受控/非受控状态要明确优先级，默认值只作为初始化语义使用。
- **样式 API**：`className` 默认作用在组件 root。复杂组件提供 `classNames` slot API，让使用方定制 root、container、trigger、popover、item、cell 等关键节点；不要要求使用方 fork 内部实现或依赖脆弱选择器。
- **可访问性**：优先使用 React Aria 原语。交互状态必须语义准确：二态按钮可用 `aria-pressed`，排序这类三态状态应由表头 `aria-sort` 或明确 label 表达，不能把“未排序”和“降序”混成同一个状态。按钮 label 要说明当前状态和动作。
- **交互隔离**：嵌在可点击容器里的按钮、菜单、链接必须阻止不该冒泡的事件，避免一次点击触发两层行为。例如表头整体排序时，筛选/排序按钮点击不能再次触发表头排序。
- **性能边界**：客户端过滤/排序只适合中小数据量。若组件可能承载大数据，设计 `manual`/server-side 模式、分页、虚拟滚动或 debounce 的扩展点；不要把全量计算写死为唯一模式。
- **测试要求**：改组件必须补组件测试。至少覆盖渲染、公共 API、受控/非受控状态、关键交互、a11y 文案/ARIA、slot classNames。若 app 中已有消费示例，也同步跑对应 app 测试。

`DataTable` 是当前基准实现：`packages/ui/src/table` 展示了 public barrel、`internal/`、`hooks/`、`utils/`、slot classNames、React Aria 表格语义和受控状态测试的组织方式。后续通用组件优先对齐这套形状。

## `@repo/ui` 组件清单（手写前先查）

全部从 `@repo/ui` 具名导入。清单以 `packages/ui/src/index.ts` 实际导出为准；组件 Props 有 TS 约束，类型报错即用法提示。

| 你想写的 | 用现成的 |
| --- | --- |
| 按钮 / 链接按钮 | `Button`，图标按钮 `ButtonUtility` |
| 输入框 / 表单字段 | `Input` + `Label` + `HintText` |
| 搜索框 | `SearchField` |
| 下拉选择 / combobox | `Select`、`Dropdown` |
| 复选 / 单选 / 开关 | `Checkbox`、`RadioGroup`+`RadioButton`、`Toggle` |
| 日期选择 | `DatePicker`（配 `parseDate`/`DateValue`） |
| 卡片 | `Card`(+`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`) |
| 标签 / 徽标 | `Badge`；可交互标签组 `TagGroup`+`TagList`+`TagItem` |
| 头像 | `Avatar` |
| 选项卡 | `Tabs`(+`TabsList`/`TabsItem`/`TabsPanels`/`TabsPanel`) |
| 分页 | `Pagination` |
| 弹窗 / 对话框 | `Modal` |
| 提示气泡 | `Tooltip`+`TooltipTrigger` |
| 轮播 | `Carousel`（`useCarousel`） |
| Toast 通知 | `ToastRegion`+`ToastQueue` |
| 入场动画 | `FadeInUp` |
| 合并 className | `cn`（tailwind-merge，别手拼字符串） |

通用 Hook 同理：媒体查询、locale 等先查 `@repo/hooks`；新写的通用 hook 放 `packages/hooks/src/` 并导出，绑业务接口的才留 app 内。

## 图标：只用 `@repo/icons`

- 禁内联 `<svg>`、禁装 `lucide-react`/`react-icons`。统一 `<SvgIcon name="..." />`（`name` 有类型约束）。
- 缺图标：`.svg` 放进 `packages/icons/svg/` → `pnpm --filter @repo/icons build` → 提交生成文件。已有图标用 `ls packages/icons/svg/` 查。
- `<SvgSprite />` 各 app 根组件已注入，勿重复加。

## 样式

- 只用 Tailwind；条件类名用 `cn`/`clsx`，不字符串拼接。
- **用设计令牌不硬编码颜色**：`bg-background` `text-foreground` `text-muted-foreground` `border-border` `bg-primary` `bg-card` `bg-destructive` 等（定义见 `packages/styles/src/base.css`）。暗色用语义令牌自动适配，必要时加 `dark:`，别写死 `#fff`/`#000`。
- **移动优先响应式**：基础样式给移动端，再 `sm: md: lg: xl:` 逐级增强；布局/字号/间距每个断点都要顾及，避免写死宽度。

## 数据获取：走 `@repo/api`，不散落裸 fetch

- 取数统一走 `@repo/api` 类型化 client / 复用其 `*Req`/`*Resp` 类型，错误统一 `ApiError`；请求逻辑下沉到 `apps/*/hooks/use-*`，组件只消费。**加端点、选 fetch helper、各端消费通道（SC / admin / web 客户端）见 `extending-api` skill。**
- 生产代码不 import `app/_mock`（仅限测试）；无接口时标 `// TODO(api): 待后端提供 xxx` 并临时降级，import 不指向 `_mock`。

## 列表项组件必须 `memo`，回调 props 必须稳定

`.map()` 渲染出的、会因为"列表里任意一项交互（点赞/回复/编辑/删除）"而跟着重渲染的卡片类组件（评论/留言/文章/碎语卡片等）必须 `React.memo`；父级传给它的每个回调 prop 必须是 `useCallback` 稳定引用，衍生数据只有真正变化的那一项才能产生新对象引用（`items.map(i => i.id === changedId ? {...i, ...} : i)`，未变项保留原引用）。只加 `memo` 不管这个前提等于没加——任何一个 prop 引用不稳定，memo 就会被打穿。

- **为什么必须双管齐下**：这类组件不加 `memo`，点击列表里任意一项都会让全部同级项的组件函数体重新执行一遍。多数时候只是浪费渲染；但如果某个子组件用 `dangerouslySetInnerHTML` 渲染内容、又在 `useEffect` 里对同一段 DOM 做命令式的懒加载/骨架屏揭示（比如 Markdown 正文图片懒加载），这类无关重渲染会让 React 把这段 DOM 整体重写，将已经手动加载好的图片打回骨架屏——且懒加载用的 `IntersectionObserver` 因为 effect 依赖没变不会重新绑定，图片会永久卡死，直到刷新页面。真实案例：`GuestbookItem`／`ThreadCommentContent`／`MarkdownContent` 都补了 `memo` 才修好，见 `packages/markdown/src/markdown-content.tsx`、`apps/web/components/guestbook/guestbook-item.tsx`。
- **凡是 `dangerouslySetInnerHTML` + `useEffect` 里做 DOM 副作用（懒加载 / 骨架屏揭示 / 失败重试）的叶子组件，本身也必须 `memo`**，不能只指望上层列表项 memo 兜底——它可能被多条链路复用。
- **验收方式**：改完后在列表里触发任意一项的交互，确认其它项不会重新挂载/重渲染（React DevTools Profiler 高亮，或 `console.count` 打点）。

## 别再制造这些债（重构清单的教训）

- ❌ app 手写基础 UI → ✅ `@repo/ui`
- ❌ 内联 `<svg>` / 第三方图标库 → ✅ `<SvgIcon>`
- ❌ 客户端裸 `fetch("/api/...")` → ✅ `@repo/api` client
- ❌ 生产代码引用 `_mock` → ✅ 真实接口或带 TODO 的降级
- ❌ `any` → ✅ `unknown` / 精确类型
- ❌ 单组件文件 > 250 行 → ✅ 拆子组件 + 抽 hook
- ❌ `eslint-disable jsx-a11y/*` 绕无障碍 → ✅ react-aria 原语或补 `role`+键盘处理
- ❌ 列表卡片组件不加 `memo`，任意一项交互引发全列表重渲染 → ✅ `React.memo` + 回调 `useCallback`
- ❌ `dangerouslySetInnerHTML` 里靠 `useEffect` 做懒加载/骨架屏又不 `memo` → ✅ 该组件本身也要 `memo`，否则无关重渲染会把命令式加载好的 DOM 重写回初始态
