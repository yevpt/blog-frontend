# 图片全屏预览（ImageViewer）设计

日期：2026-06-20

## 目标

为以下来源的图片提供点击全屏预览，支持缩放、平移、旋转等操作：

1. 文章正文中 markdown 渲染出的图片
2. 评论 / 留言板中 markdown 渲染出的图片
3. 文章详情页顶部的封面图

架构需为「未来更多场景」预留扩展点：多图画廊切换、caption、下载、任意新触发源接入。

不在本期范围：编辑器实时预览区（packages/editor）的图片预览；admin 端接入（组件本身 app 无关，可后续复用）。

## 关键约束（现状）

- markdown 经 `markdownToHtmlSync` / `markdownToHtml` 渲染为 HTML 字符串，再由
  [`MarkdownContent`](../../../packages/markdown/src/markdown-content.tsx) 通过 `dangerouslySetInnerHTML` 注入。
  图片是原生 `<img>`，**拿不到 React props**，只能用**事件委托**响应点击（复制按钮已是此模式）。
- 文章封面在 [`article-hero.tsx`](../../../apps/web/components/article-detail/article-hero.tsx) 中由
  `LoadingImage`（Next Image）渲染，是 React 组件，可直接 `onClick`。
- `@repo/ui` 已有基于 React Aria 的 `Modal`；无任何 zoom/lightbox 依赖。
- 包依赖边界：`@repo/ui` 依赖 `react-aria-components`、`@repo/icons`，**不依赖** markdown；
  `@repo/markdown`、`@repo/hooks` 仅依赖 react；Zustand 仅存在于 apps 层。
  → 决定了「渲染层放 @repo/ui、状态层 Zustand 放 apps/web、markdown 靠回调注入保持解耦」。

## 决策

- 实现方式：**自建** `@repo/ui` 组件（不引入外部 lightbox 库），复用已有 React Aria `Modal`。
- 画廊：本期只做单图打开，但数据流 / 类型按多图设计，左右切换能力预留。
- 手势：滚轮缩放 + 拖拽平移 + 双击切换、移动端双指捏合、旋转、键盘 ESC/方向键 + 底部工具栏。
- 覆盖范围：文章正文 + 评论 + 留言板 + 封面。

## 架构：三层解耦（触发 / 状态 / 渲染）

```
触发层(多个)  ──open(images, index)──▶  状态层(Zustand 单例)  ──▶  渲染层(@repo/ui ImageViewer)
 ├ MarkdownContent 委托点击                useImageViewerStore           受控组件，layout 挂一次
 ├ 文章封面 onClick
 └ 未来任意组件
```

### 1. 渲染层 —— `@repo/ui` `ImageViewer`（纯受控、零全局状态）

目录沿用仓库约定（dir + `index.ts` barrel + `types.ts` + `internal/`，与 dropdown/popover 一致）：

```
packages/ui/src/image-viewer/
  index.ts                          # barrel 导出
  image-viewer.tsx                  # 主组件：Modal 覆盖层 + <img> + 工具栏
  types.ts                          # ImageItem / ImageViewerProps / ViewerTransform
  image-viewer.test.tsx
  internal/
    use-viewer-transform.ts         # 缩放/平移/旋转状态机（手势核心，可独立测试）
    use-viewer-transform.test.ts
    toolbar.tsx                      # 底部工具栏
```

类型：

```ts
interface ImageItem {
  src: string;
  alt?: string;
  // 预留：caption?, downloadUrl?, srcSet?, width?, height?
}

interface ViewerTransform {
  scale: number;
  x: number;
  y: number;
  rotation: number; // 角度，90° 步进
}

interface ImageViewerProps {
  images: ImageItem[];
  index: number;
  isOpen: boolean;
  onClose(): void;
  onIndexChange?(index: number): void; // 画廊切换预留
}
```

要点：

- 基于 React Aria `Modal`：自带 focus-trap、ESC、scroll-lock、a11y。
- 预览图用原生 `<img className="object-contain">`（源多为外链 URL，不走 Next Image）。
- `use-viewer-transform`：手势统一用 **Pointer Events**（一套覆盖鼠标拖拽 + 触屏单指拖拽 +
  双指捏合），`wheel` 处理滚轮缩放；负责缩放钳制（min/max scale）、平移边界、90° 旋转、
  双击切换「原始 / 适配」尺寸。**工作量与回归风险最高的单元**，单独成 hook 并重点测试。
- `toolbar`：缩放±、重置、旋转、下载、关闭，图标走 `@repo/icons`（如缺图标，新增 svg 走 icons 流程）。
- 键盘：ESC 关闭；方向键切图（画廊就绪后生效）。

### 2. 状态层 —— `apps/web` `useImageViewerStore`（Zustand）

遵循「store 只在 app 层」约定，放 `apps/web/store/use-image-viewer.ts`：

```ts
interface ImageViewerStore {
  isOpen: boolean;
  images: ImageItem[];
  index: number;
  open(images: ImageItem[], index: number): void;
  close(): void;
  setIndex(index: number): void;
}
```

`apps/web/app/layout.tsx` 挂一个 `<ImageViewerHost/>`（client 组件），订阅 store 并渲染
`<ImageViewer images index isOpen onClose onIndexChange />`。**全站仅此一个实例**；
未来任意组件调 `open(...)` 即可弹出预览。

### 3. 触发层

- **Markdown 图片**：在 `MarkdownContent` 现有委托 handler 中**新增 `img` 分支**（与复制按钮共用
  同一监听器），新增可选 prop `onImagePreview?(images: ImageItem[], index: number)`。
  点击时 `container.querySelectorAll("img")` 收集本容器全部图片为 `ImageItem[]`，定位被点击者为
  `index`——**天然产出画廊列表**，未来开启左右切换零改动。
  `@repo/markdown` 不依赖 `@repo/ui`，通过回调注入保持解耦；`ImageItem` 类型在 markdown 包内
  本地声明（结构等价），或从 ui 复用——实现时以「不引入反向依赖」为准，倾向 markdown 包本地最小声明。
- **避免四处重复接线**：web 新增薄包装组件
  `apps/web/components/common/previewable-markdown.tsx`，包住 `MarkdownContent` 并把
  `onImagePreview` 接到 store。以下调用点统一替换为它：
  - `apps/web/components/article-detail/article-content.tsx`
  - `apps/web/components/comments/comment-item.tsx`
  - `apps/web/components/comments/comment-replies.tsx`
  - `apps/web/components/guestbook/guestbook-item.tsx`
- **文章封面**：`article-hero.tsx` 的 `LoadingImage` 外包 `<button>`（保证键盘可达 + 焦点样式）
  → `open([cover], 0)`（单图模式，不与正文图混入同一画廊）。
- markdown 图片加 `cursor-zoom-in` 视觉提示（comment variant 小图同样可点开看全尺寸）。

## 数据流

1. 用户点击图片（markdown 委托 / 封面 onClick）。
2. 触发源构造 `ImageItem[]` 与 index，调 `store.open(images, index)`。
3. `ImageViewerHost` 订阅到 `isOpen=true`，渲染 `<ImageViewer/>`。
4. 组件内 `use-viewer-transform` 接管手势 / 工具栏 / 键盘，维护本地 transform。
5. 切图（画廊预留）调 `onIndexChange` → `store.setIndex`；关闭调 `onClose` → `store.close`，
   关闭时 transform 重置。

## 错误处理与边界

- 预览图加载失败：显示占位/错误态（复用 `LoadingImage` 思路或简单 fallback）。
- 跨域外链「下载」可能无法强制下载 → 降级为新标签打开（`target="_blank" rel="noopener"`）。
- markdown 安全：图片已由 `rehype-sanitize` 清洗；viewer 仅读取既有 DOM 的 `src`/`alt`，无新注入面。
- 空 `images` 或越界 `index` 时不打开 / 安全钳制。

## 测试（按 AGENTS.md 强制）

- `packages/ui/.../use-viewer-transform.test.ts`：缩放钳制、平移边界、旋转步进、双击切换。
- `packages/ui/.../image-viewer.test.tsx`：渲染、ESC 关闭、工具栏按钮行为、键盘、a11y（role/alt）。
- 扩展 `packages/markdown/src/markdown-content.test.tsx`：点击 `img` 触发
  `onImagePreview(images, index)`，且不影响复制按钮逻辑。
- `apps/web` `previewable-markdown.test.tsx`：点击图片调 store.open。
- `apps/web/store` `use-image-viewer` store 测试：open/close/setIndex。
- 更新 `apps/web/components/article-detail/article-hero.test.tsx`：点封面调 store.open。

## 风险

- 自建捏合 / 平移几何计算是主要工作量与回归风险，需重点投入与测试。
- 跨域下载受限，已定降级策略。
- 封面包 `<button>` 的键盘可达性与焦点样式需验证。
