# 碎语发布弹窗（ThoughtComposerModal）设计

日期：2026-06-22
目标 app：`apps/web`（前台站点）
关联：碎语在代码中即 `moment`（随想），后端已支持随想图片。

## 1. 目标与范围

提供一个「写碎语」发布弹窗，体验类似发推：上方内联富文本编辑器（隐藏插入图片），下方图片插入区。

范围内：
- 内联富文本输入（复用 `@repo/editor` 的 `RichEditor`）。
- 图片插入：最多 9 张，选图即压缩至 ~500KB，点击预览、删除、拖拽排序，发布时才上传。
- 800 字限制与发布态控制。
- 响应式外壳：桌面居中 modal，移动端底部上拉 sheet（可拖到全屏），抽成公用组件。

范围外（本期不做）：草稿暂存、定位/话题/表情、视频、@提及、编辑已发布碎语。

## 2. 组件结构

```
ThoughtComposerModal              ← 业务入口，组装 + 提交编排
  └─ ResponsiveModal (公用外壳)    ← 桌面 dialog / 移动 sheet 切换 + 手势
       ├─ header: 头像 + 「写碎语」 + 关闭
       ├─ body:
       │    ├─ RichEditor (@repo/editor，不传 onInsertImage → 隐藏图片按钮)
       │    └─ ThoughtImageUploader   ← 选图/压缩/预览/删除/排序
       └─ footer: 添加图片(x/9) · 字数(x/800) · 发布
```

### 2.1 ResponsiveModal（公用外壳，本次抽取）

现状：`apps/web/components/comments/views/comment-modal.tsx` 已实现「桌面居中 dialog + 移动底部 sheet（可拖到全屏）」，但与评论内容耦合。本次把外壳抽成公用组件，`CommentModal` 与 `ThoughtComposerModal` 共用。

抽取后职责：
- 用 `matchMedia("(min-width: 768px)")` 在打开时锁定 desktop / mobile（沿用现有做法，避免初始抖动重复挂载）。
- 桌面：`@repo/ui` `Modal placement="center"`，复用 `useAnimatedClose` + `useAnimatedPanelHeight`（内容变化时高度 spring 过渡）。
- 移动：`Modal placement="sheet"` + `useSheetGesture`，70dvh ↔ 100dvh 拖拽展开/收起/下滑关闭，顶部 grab handle。
- 对外接口（props）：
  - `title: ReactNode`、`onClose: () => void`、`isDismissable?`
  - `children: (args: { scrollRef; requestClose; onContentResize }) => ReactNode`（render-prop，body 自管滚动区）
  - `footer?: ReactNode`（常驻底栏，sheet 全屏时也固定可见）
- 位置：`apps/web/components/modal-shell/responsive-modal.tsx`；`useSheetGesture` 维持在 `apps/web/hooks/`。仅 web 使用，暂不上提 `packages/ui`；若 admin 后续需要再提升。
- 重构 `CommentModal` 改用 `ResponsiveModal`，行为保持不变（含既有测试通过）。

### 2.2 编辑器区

- 直接用 `@repo/editor` 的 `RichEditor`，**不传 `onInsertImage`**——`Toolbar` 内图片按钮是 `{onInsertImage && ...}` 条件渲染，不传即隐藏。
- 工具栏保留：**加粗 / 斜体 / 下划线 ｜ 链接 / 代码**。不启用 @提及（不传 `mentionSuggestions`/相关 handler）。
- 占位符「此刻有什么想法？」。编辑区 `min-h ≈ 84px`、`max-h ≈ 200px`，超出内部滚动。
- 字数：取纯文本长度，footer 显示 `x/800`，超限标红且禁用发布（详见 §4）。

### 2.3 ThoughtImageUploader（新组件）

内部状态：`items: { id: string; file: File; previewUrl: string }[]`（已压缩后的 `File` + `objectURL`）。

- 布局：`grid-template-columns: repeat(3, 80px)`，`gap: 10px`，`justify-content: start`（**固定 80px，不铺满宽度，尺寸恒定**）。满 9 张为 3 行 ≈ 260px，无需滚动。
- 末位「添加」格（虚线 80px，`ti-plus`），`items.length < 9` 时显示；点击触发隐藏 `<input type=file accept="image/*" multiple>`。footer 的「添加图片」按钮等价触发。
- 删除键：方案 B —— 右上角内嵌**正圆** 20×20（等宽高 + `border-radius:50%` + flex 居中，避免被挤成椭圆），白色实心圆 + 深色细 X（`ti-x`），无投影；常驻显示（移动端可直接点），命中区移动端 ≥28px。
- 点击缩略图（非删除键）打开 `@repo/ui` 的 `image-viewer` 预览当前图，可左右切换。
- 拖拽排序：`@dnd-kit/sortable`（新增依赖）。触屏用带 delay 的指针传感器（长按触发，区分滚动），键盘可达；拖拽时轻微放大 + spring 位移。
- 选图回调：见 §3 压缩与并发约束。
- 卸载/删除时 `URL.revokeObjectURL` 释放预览。

## 3. 图片处理与提交流程

- **压缩时机**：选图即压缩。用 `browser-image-compression` 把每张压到 ~500KB（`maxSizeMB ≈ 0.5`，限制最长边，保留类型）。压缩在 worker 中进行，压缩期间该格显示 loading，失败则该张 toast 报错并跳过。
- **数量约束**：`items.length` 达 9 隐藏「添加」格；一次选超量只取到补满 9 张。
- **校验**：仅接受 `image/*`；压缩后仍 > 3MB 视为异常（toast 跳过）。
- **删除/排序**：仅操作内存数组顺序，不触网。
- **发布（提交时才上传）**：
  1. 校验：非空（有文字或有图）且字数 ≤ 800，否则发布禁用。
  2. 并发上传所有压缩后 `File` 到 Garage（沿用现有图片上传接口），按 `items` 顺序收集返回 URL 数组。
  3. 调用随想创建接口，提交 `{ content, images: string[] }`（`content` 为编辑器输出；图片顺序 = 数组顺序）。
  4. 上传/提交期间发布按钮 loading、整窗禁用交互；任一步失败 toast 报错并保留弹窗内容（可重试），不做半成品提交。
  5. 成功后关闭弹窗并通知上层刷新列表。
- 上传接口与随想创建接口的确切契约在实现计划阶段对照 `apps/web/app/api/moments/*` 与后端确认。

## 4. 交互 / 状态

- 发布按钮禁用条件：`字数 > 800` 或 `(纯文本为空 且 无图片)` 或 上传中。
- 字数计数：`≤800` 用 `text-tertiary`，`>800` 用 `text-danger`。
- 关闭：点遮罩 / 关闭键 / 移动端下滑关闭；若有未发布内容，二次确认（`window.confirm` 或轻提示）后再关。
- 动效：弹窗淡入+轻缩放（桌面）/ 上滑（移动）；图片格进出场与拖拽位移 spring；删除淡出。`prefers-reduced-motion` 时降级。

## 5. 响应式

- ≥768px：居中 modal，宽约 460–520px，高度随内容 spring，封顶 90vh。
- <768px：底部 sheet，70dvh 起，可拖到 100dvh 全屏；footer 固定可见，图片区与编辑区在 body 滚动容器内。

## 6. 依赖与影响

- 新增依赖：`@dnd-kit/core` + `@dnd-kit/sortable`、`browser-image-compression`。
- 复用：`@repo/editor`（RichEditor）、`@repo/ui`（Modal、image-viewer、toast、button）、`useSheetGesture`、`useAnimatedClose`/`useAnimatedPanelHeight`。
- 重构：`CommentModal` 迁移到 `ResponsiveModal`，保持既有测试通过。

## 7. 测试要点

- `ResponsiveModal`：桌面渲染 dialog / 移动渲染 sheet；关闭回调；footer 常驻。
- `ThoughtImageUploader`：选图压缩并加入；超 9 截断；删除释放 URL；排序后顺序正确；点击预览；非图片/超限跳过。
- `ThoughtComposerModal`：发布禁用条件；提交时按顺序上传并组装 payload；失败保留内容可重试。
- 回归：`CommentModal` 既有测试全绿。
