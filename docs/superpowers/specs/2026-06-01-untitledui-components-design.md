# Untitled UI 组件集成设计文档

**日期**：2026-06-01  
**范围**：`packages/ui`、`packages/icons`、`apps/web`

---

## 背景

将以下 Untitled UI React 免费开源组件集成到 blog-frontend monorepo：
- 新增：Dropdown、Select、Tooltip、ButtonUtility、Toggle、Input（升级现有实现）
- 替换：Carousel（现有手写滑动）、Pagination（现有手写 Base）

---

## 方案选择

**选定方案 B：从 GitHub 手动复制源码 + 适配 monorepo**

放弃 CLI（`npx untitledui@latest add`）的原因：CLI 为独立 Next.js/Vite 应用设计，需要 `components.json` 配置和 `@/` 路径别名，与 library package（`packages/ui`）的结构冲突，且仍需手动修改图标导入。

---

## 架构与文件布局

### packages/ui/src/ 新增目录

```
carousel/
  carousel-base.tsx       ← Untitled UI Carousel（Embla 基础层）
  carousel-base.test.tsx
dropdown/
  dropdown.tsx
  dropdown.test.tsx
select/
  select.tsx
  select.test.tsx
tooltip/
  tooltip.tsx
  tooltip.test.tsx
button-utility/
  button-utility.tsx
  button-utility.test.tsx
toggle/
  toggle.tsx
  toggle.test.tsx
avatar/                   ← Dropdown/Select 内部依赖，不对外导出
  avatar.tsx
  avatar.test.tsx
checkbox/                 ← Dropdown 内部依赖，不对外导出
  checkbox.tsx
  checkbox.test.tsx
radio-buttons/            ← Dropdown 内部依赖，不对外导出
  radio-buttons.tsx
  radio-buttons.test.tsx
```

### packages/ui/src/input/ 拆分

现有单文件 `input.tsx` 升级为目录：

```
input/
  input.tsx               ← 替换现有实现（新增密码显示、tooltip、error state）
  label.tsx               ← 新增
  hint-text.tsx           ← 新增
  index.ts                ← re-export（保持 @repo/ui 导出路径不变）
  input.test.tsx          ← 替换原 src/input.test.tsx（原文件同步删除）
```

### packages/ui/src/pagination/

仅替换 `pagination-base.tsx`，其余文件不变：

```
pagination/
  pagination-base.tsx     ← 替换为 Untitled UI 版本（保留 useMemo 优化）
  pagination.tsx          ← 不变
  index.ts                ← 不变
  pagination.test.tsx     ← 更新
```

### apps/web 变更

```
components/featured/
  featured-carousel.tsx             ← 重写（使用 Carousel.Root + setApi）
  featured-carousel-slide.tsx       ← 小改：移除 isActive prop，移动端文字区移入
  featured-carousel-indicators.tsx  ← 删除（由 Carousel.IndicatorGroup 替代）
  featured-carousel.test.tsx        ← 更新
```

---

## Section 1：图标适配

### 新增 SVG 文件（packages/icons/svg/）

从 Heroicons outline 取，与现有图标笔触风格一致：

| 文件名 | 对应 @untitledui/icons | 使用组件 |
|---|---|---|
| `eye-off.svg` | `EyeOff` | Input 密码隐藏 |
| `help-circle.svg` | `HelpCircle` | Input tooltip 触发 |
| `info-circle.svg` | `InfoCircle` | Input hint |
| `check.svg` | `Check` | Dropdown 选中状态 |
| `chevron-down.svg` | `ChevronDown` | Select 下拉箭头 |
| `dots-vertical.svg` | `DotsVertical` | Dropdown 操作菜单 |

添加后运行 `pnpm --filter @repo/icons build`。

### 内部图标替换规则

组件源码中所有 `from '@untitledui/icons'` 导入直接替换为 `<SvgIcon name="..." size={16} />` 调用，**不引入任何适配包装层**：

| @untitledui/icons | 替换为 |
|---|---|
| `<Eye className="size-4 ...">` | `<SvgIcon name="eye" size={16} />` |
| `<EyeOff className="size-4 ...">` | `<SvgIcon name="eye-off" size={16} />` |
| `<HelpCircle className="size-4 ...">` | `<SvgIcon name="help-circle" size={16} />` |
| `<InfoCircle ...>` | `<SvgIcon name="info-circle" size={16} />` |
| `<Check className="size-4 ...">` | `<SvgIcon name="check" size={16} />` |
| `<ChevronDown className="size-4 ...">` | `<SvgIcon name="chevron-down" size={16} />` |
| `<ChevronRight className="size-4 ...">` | `<SvgIcon name="chevron-right" size={16} />` |
| `<DotsVertical className="size-4 ...">` | `<SvgIcon name="dots-vertical" size={16} />` |

### 图标作为 Props 的公开 API

`icon?: FC<{className?: string}>` 类型的 prop（Dropdown 列表项等）保持原有类型不变。调用方传入形如 `() => <SvgIcon name="..." />` 的包装器。

---

## Section 2：import 路径映射

复制 Untitled UI 源码时按下表替换所有路径：

| 原始路径 | 适配后路径 |
|---|---|
| `@/utils/cx` | `../lib/utils`（使用 `cn` 代替 `cx`） |
| `@/utils/is-react-component` | `../lib/is-react-component` |
| `@/components/base/tooltip/tooltip` | `../tooltip/tooltip` |
| `@/components/base/input/hint-text` | `./hint-text`（在 input/ 内）/ `../input/hint-text`（在其他目录） |
| `@/components/base/input/label` | `./label`（在 input/ 内）/ `../input/label`（在其他目录） |
| `@/components/base/avatar/avatar` | `../avatar/avatar` |
| `@/components/base/checkbox/checkbox` | `../checkbox/checkbox` |
| `@/components/base/radio-buttons/radio-buttons` | `../radio-buttons/radio-buttons` |
| `@/components/base/toggle/toggle` | `../toggle/toggle` |

### 工具函数扩展

`packages/ui/src/lib/utils.ts` 新增 no-op：

```ts
export function sortCx<T>(classes: T): T { return classes; }
```

新建 `packages/ui/src/lib/is-react-component.ts`（从 Untitled UI utils 复制，无需修改）。

---

## Section 3：Carousel 替换策略

### 视觉行为变化

| | 旧实现 | 新实现 |
|---|---|---|
| 切换动画 | opacity fade（绝对定位叠层） | Embla CSS transform 横向滑动 |
| 自动播放 | `setInterval` + useState index | `setInterval` + `api.scrollNext()` |
| 指示器 | 独立组件手动同步 | `Carousel.IndicatorGroup` + context |
| 键盘导航 | 无 | `Carousel.Root` 内置 ArrowLeft/Right |

### FeaturedCarousel 重写要点

```
1. Carousel.Root opts={{ loop: true }} setApi={setApi}
2. useEffect: isHovered ? clearInterval : setInterval(() => api?.scrollNext(), 4000)
3. Carousel.Content > Carousel.Item（每项包含 FeaturedCarouselSlide）
4. FeaturedCarouselSlide 内移动端文字区（随幻灯片一起滑动，不再需要独立同步）
5. 指示器：Carousel.IndicatorGroup + Carousel.Indicator（render prop 形式，保留 droplet-filled 图标样式）
```

### FeaturedCarouselSlide 变更

- 移除 `isActive` prop（Embla 通过 CSS 控制可见性，无需手动 opacity）
- 移入移动端文字区（`h-44 bg-card` 区块）
- 保留 LCP 图片预加载逻辑（`isLcpCandidate` prop 不变）

### 新增依赖

`packages/ui/package.json` 新增：
```json
"embla-carousel-react": "^8.0.0"
```

---

## Section 4：Pagination 替换策略

### 官方版本问题

官方 `pagination-base.tsx` 使用 `useState + useEffect` 异步更新 pages 数组，导致快速翻页时高亮/省略号错位（一帧延迟）。

### 修复方案

保留官方版本的完整类型定义和组件结构，将 pages 计算替换为 `useMemo`：

```ts
// 官方版本（有问题）
const [pages, setPages] = useState([]);
useEffect(() => { setPages(createPaginationItems()); }, [createPaginationItems]);

// 替换为（同步计算）
const pages = useMemo(() => createPaginationItems(), [createPaginationItems]);
```

`PaginationItem` 使用官方版本的 `isCurrent` prop 决定 `isSelected`（与官方结构一致）——`useMemo` 保证 pages 数组始终同步，`isCurrent` 在每次渲染时均为最新值，与 context `currentPage` 等价。

---

## Section 5：packages/ui exports 更新

```ts
// 新增
export { Carousel, CarouselContext, useCarousel } from "./carousel/carousel-base";
export { Dropdown }                               from "./dropdown/dropdown";
export { Select }                                 from "./select/select";
export { Tooltip, TooltipTrigger }               from "./tooltip/tooltip";
export { ButtonUtility }                          from "./button-utility/button-utility";
export { Toggle }                                 from "./toggle/toggle";

// 更新（路径调整，API 不变）
export { Input, type InputProps }                from "./input";
export { Pagination, PaginationBase, type PaginationProps } from "./pagination";
```

Avatar、CheckboxBase、RadioButtonBase 为 Dropdown 内部依赖，**不对外导出**。

---

## Section 6：测试文件清单

| 文件 | 操作 | 最低覆盖要点 |
|---|---|---|
| `packages/ui/src/carousel/carousel-base.test.tsx` | 新建 | 渲染不崩溃；指示器数=幻灯片数；首张 Prev 禁用 |
| `packages/ui/src/input/input.test.tsx` | 替换 | 渲染；label/placeholder；密码可见性切换；错误状态 |
| `packages/ui/src/dropdown/dropdown.test.tsx` | 新建 | 渲染触发器；点击打开；选项可交互 |
| `packages/ui/src/select/select.test.tsx` | 新建 | 渲染 placeholder；打开列表；选中更新 |
| `packages/ui/src/tooltip/tooltip.test.tsx` | 新建 | 渲染 children；hover 显示提示文字 |
| `packages/ui/src/button-utility/button-utility.test.tsx` | 新建 | 渲染；点击回调 |
| `packages/ui/src/toggle/toggle.test.tsx` | 新建 | 渲染；onChange 触发；受控状态 |
| `packages/ui/src/avatar/avatar.test.tsx` | 新建 | 渲染不崩溃；alt 文字 |
| `packages/ui/src/checkbox/checkbox.test.tsx` | 新建 | 渲染；选中/取消 |
| `packages/ui/src/radio-buttons/radio-buttons.test.tsx` | 新建 | 渲染；选项切换 |
| `packages/ui/src/pagination/pagination.test.tsx` | 更新 | 原有测试通过；验证 useMemo 同步更新 |
| `apps/web/components/featured/featured-carousel.test.tsx` | 更新 | 渲染全部幻灯片；指示器数量；auto-play mock |

---

## 实施顺序

依赖拓扑要求按以下顺序实施：

1. `packages/icons`：添加 6 个 SVG + build
2. `packages/ui/src/lib/`：`utils.ts`（sortCx）、`is-react-component.ts`
3. `packages/ui`：添加 `embla-carousel-react` 依赖
4. `packages/ui/src/tooltip/`（无内部依赖）
5. `packages/ui/src/toggle/`（无内部依赖）
6. `packages/ui/src/input/`（依赖 tooltip）
7. `packages/ui/src/button-utility/`（依赖 tooltip）
8. `packages/ui/src/avatar/`（无内部依赖）
9. `packages/ui/src/checkbox/`（无内部依赖）
10. `packages/ui/src/radio-buttons/`（无内部依赖）
11. `packages/ui/src/dropdown/`（依赖 avatar、checkbox、radio-buttons、toggle）
12. `packages/ui/src/select/`（依赖 avatar、input/label、input/hint-text）
13. `packages/ui/src/carousel/`
14. `packages/ui/src/pagination/`（替换 pagination-base.tsx）
15. `packages/ui/src/index.ts`（更新导出）
16. `apps/web`：重写 FeaturedCarousel

---

## 不在本次范围内

- Avatar、CheckboxBase、RadioButtonBase 的样式定制（仅作为 Dropdown 依赖安装）
- Untitled UI 其他未列出组件
- 主题/颜色系统迁移到 Untitled UI 变量
