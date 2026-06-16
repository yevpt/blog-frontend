---
name: "building-ui"
description: "Use when writing or editing any UI in this monorepo — JSX/TSX markup, Tailwind classes, page.tsx, or React components in apps/web, apps/admin, or packages/ui. Provides the reuse-first component inventory (what to import from @repo/ui instead of hand-rolling), the icon/style/data-fetch rules, and the concrete anti-patterns from the refactor backlog so you don't recreate known debt. Trigger before reaching for a raw <button>, <input>, <svg>, fetch(), or a custom Tailwind widget."
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

## 别再制造这些债（重构清单的教训）

- ❌ app 手写基础 UI → ✅ `@repo/ui`
- ❌ 内联 `<svg>` / 第三方图标库 → ✅ `<SvgIcon>`
- ❌ 客户端裸 `fetch("/api/...")` → ✅ `@repo/api` client
- ❌ 生产代码引用 `_mock` → ✅ 真实接口或带 TODO 的降级
- ❌ `any` → ✅ `unknown` / 精确类型
- ❌ 单组件文件 > 250 行 → ✅ 拆子组件 + 抽 hook
- ❌ `eslint-disable jsx-a11y/*` 绕无障碍 → ✅ react-aria 原语或补 `role`+键盘处理
