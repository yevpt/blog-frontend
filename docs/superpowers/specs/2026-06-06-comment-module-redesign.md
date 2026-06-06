# 评论模块重设计 · 设计文档

**日期**：2026-06-06  
**状态**：待实现  
**范围**：apps/web 评论模块全量重构

---

## 背景

现有评论模块功能完整但视觉简陋，交互缺失（无回复折叠、弹窗手势粗糙）。  
本次重设计目标：对齐 Instagram 评论的交互质量，同时为后续多场景复用打好组件架构基础。

**当前文件结构**：

```
apps/web/components/comments/
  comment-input.tsx
  comment-item.tsx
  comment-modal.tsx
  comment-section.tsx
  index.ts
apps/web/hooks/
  use-comment-list.ts
  use-comment-submit.ts
```

---

## 核心架构：三层分离

> **这是本次设计最重要的约束**。评论模块后续需覆盖四个场景：
> - 移动端弹窗（当前实现目标）
> - PC 端弹窗（后续）
> - 移动端内嵌（文章详情 / 留言板）
> - PC 端内嵌
>
> 组件必须"可拆可组"，各层职责单一，不能跨层耦合。

```
┌──────────────────────────────────────────────────────────┐
│  Layer 3：Shell（外壳）                                   │
│  提供容器尺寸、动画、定位，对 Section 完全透明             │
│                                                          │
│  CommentModal     移动端底部抽屉（本次实现）              │
│  CommentDialog    PC 端侧边弹窗（后续）                   │
│  ArticleComments  页面内嵌包装（后续完善）                │
├──────────────────────────────────────────────────────────┤
│  Layer 2：Section（组装层）                               │
│  连接逻辑 hooks 与原子 UI，控制布局模式                   │
│                                                          │
│  CommentSection(layout: "modal" | "inline")              │
│    modal  → 编辑器在底部（弹窗场景）                      │
│    inline → 编辑器在顶部，列表在下（页面内嵌场景）         │
├──────────────────────────────────────────────────────────┤
│  Layer 1：Primitives（原子组件，纯展示，无状态）           │
│                                                          │
│  CommentList      评论列表 + 加载更多                     │
│  CommentItem      单条评论（头像、内容、点赞、回复按钮）   │
│  CommentReplies   懒加载回复子列表                        │
│  CommentInput     输入栏（三种登录状态）                  │
├──────────────────────────────────────────────────────────┤
│  Logic Hooks（纯逻辑，无 UI）                             │
│                                                          │
│  useCommentList   列表加载、分页（现有，保持）            │
│  useCommentSubmit 提交、回复（现有，保持）                │
│  useSheetGesture  底部抽屉手势引擎（新增）                │
└──────────────────────────────────────────────────────────┘
```

**各层契约**：
- Primitive 组件不 import 任何 hook，只接收 props
- Section 不感知自己在哪个 Shell 里（不读屏幕宽度、不做定位）
- Shell 只负责容器和动画，把 `<CommentSection>` 当黑盒放入

---

## 详细设计

### 1. `useSheetGesture`（新增）

**位置**：`apps/web/hooks/use-sheet-gesture.ts`

**接口**：

```ts
interface SheetGestureOptions {
  snapThreshold?: number;      // 位移/高度比例阈值，默认 0.3
  velocityThreshold?: number;  // px/s，默认 600
  minDisplacement?: number;    // velocity 生效的最小位移保底，默认 60px
  onDismiss: () => void;
}

function useSheetGesture(
  sheetRef: RefObject<HTMLElement>,
  scrollRef: RefObject<HTMLElement>,
  options: SheetGestureOptions
): { sheetStyle: CSSProperties; isDragging: boolean }
```

**手势状态机**：

```
touchstart
  ├─ 快照 startY、startScrollTop
  ├─ 初始化 velocityTracker（滑动窗口，记录最近 100ms 的位移）
  └─ mode = "undecided"

touchmove（每帧）
  ├─ [pull-to-refresh 防御] 若 startScrollTop === 0 && deltaY > 0
  │    → 立即 preventDefault()（在 mode 确定前提前封堵，见防御策略一节）
  │
  ├─ [mode 判定] 若 mode === "undecided" && |deltaY| > 8px
  │    ├─ startScrollTop === 0 && deltaY > 0 → mode = "drag"
  │    └─ 其他 → mode = "scroll"
  │
  ├─ [drag 模式] translateY = max(0, deltaY)（向上拖有阻尼：× 0.2）
  │    └─ preventDefault() 阻止 scroll
  │
  └─ [scroll 模式] 正常滚动
       └─ 若中途 scrollTop = 0 且向下 → rubber-band（translateY = min(deltaY × 0.25, 40px)，上限 40px）
            注意：scroll 模式中途绝不切换为 drag

touchend
  └─ [仅 drag 模式才评估]
       ├─ displacement = 当前 translateY
       ├─ velocity = velocityTracker 最近 100ms 均速
       ├─ 收起条件（满足其一）：
       │    • displacement > sheetHeight × snapThreshold
       │    • velocity > velocityThreshold && displacement > minDisplacement
       └─ 否则 → spring 弹回（cubic-bezier(.32,.72,0,1)）
```

**Pull-to-refresh 防御策略（三层）**：

1. CSS：`scrollRef` 元素注入 `overscroll-behavior-y: contain`（阻止滚动边界事件冒泡）
2. Body scroll lock：Sheet 打开时锁定 body，关闭时还原（覆盖老版 iOS Safari）
   ```ts
   // 打开时
   const y = window.scrollY;
   document.body.style.cssText = `overflow:hidden;position:fixed;top:-${y}px;width:100%`;
   // 关闭时
   document.body.style.cssText = '';
   window.scrollTo(0, y);
   ```
3. 提前 `preventDefault()`：touch 监听注册在 **`sheetRef` 元素**（整个抽屉 div）上，选项为 `{ passive: false }`，不注册在 `scrollRef` 上（否则会破坏滚动）。在 `startScrollTop === 0 && deltaY > 0` 时，于 8px 阈值之前就调用 `e.preventDefault()`，关闭浏览器认领手势的窗口期

**注释要求**：
- hook 文件顶部写完整状态机流程图注释
- 每个阶段（touchstart / undecided / drag / scroll / rubber-band / touchend / dismiss / snapback）标注流程编号
- 每条防御策略注释说明它解决的具体问题及覆盖的浏览器/版本

**测试**：`apps/web/hooks/use-sheet-gesture.test.ts`
- 模拟 touch 序列，覆盖所有 mode 分支
- 重点测试：scroll 模式中途不切换为 drag；velocity 快但未松手不提前收起；displacement 小 + velocity 大但未超 minDisplacement 不收起

---

### 2. `CommentItem`（重构）

**视觉规格（Instagram 风格）**：

```
[Avatar 30px] username · 时间              🤍
              内容文本（13.5px / 1.55 行高）  数字
              回复
              ── 查看 N 条回复   ← 折叠态唯一入口
```

**回复折叠逻辑**：

- 初始：若 `comment.replies.length > 0` 或 `comment.reply_count > 0`，显示触发器，隐藏所有回复
- 点击触发器：调用 `/api/comments/[id]/replies`（懒加载），展示 loading spinner
- 展开后：触发器消失，回复列表出现在下方；若仍有更多则底部显示 `── 查看更多 M 条回复`

**回复子组件**：拆为 `CommentReplies`，持有自己的 `expanded`、`replies`、`isLoading`、`hasMore` 状态，`CommentItem` 不感知回复加载逻辑。

**回复条目**：头像 22px，样式与主评论一致（小一号），`@username` 用主色标注。

**新增 props**：
```ts
interface CommentItemProps {
  comment: CommentItemResp;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (commentId: number) => void;  // 新增，可选
}
```

---

### 3. `CommentReplies`（新增子组件）

**位置**：`apps/web/components/comments/comment-replies.tsx`

**props**：
```ts
interface CommentRepliesProps {
  commentId: number;
  initialReplies: CommentReplyResp[];  // 来自父评论 response 的初始数据（可能为空数组）
  onReply?: (target: ReplyTarget) => void;
}
```

**回复数量来源**：

- `initialReplies.length > 0` 时：直接用 `initialReplies.length` 作为"查看 N 条回复"的初始计数
- 若后端后续优化为不在主列表中返回 replies（只返回 `reply_count`），则在 `packages/api/src/types/comment.ts` 的 `CommentItemResp` 中补充 `reply_count?: number` 字段，同步更新本组件 props——**此变更不在本次范围，当前以 `initialReplies.length` 为准**

内部管理展开状态、分页加载，对外只暴露通过 `onReply` 回调。

---

### 4. `CommentInput`（重构）

**三种渲染状态**（由 `userId` 和 `value` 派生，不增加额外 prop）：

| 条件 | 渲染 |
|---|---|
| `userId == null` | 全宽 pill：`登录后参与讨论` + 右侧登录按钮，无头像 |
| `userId != null && !value.trim()` | 头像 + pill 输入框，无发送按钮 |
| `userId != null && value.trim()` | 头像 + pill + 内嵌 `↑` 圆形发送按钮 |

**回复状态**：输入框上方显示 chip `回复 @username [取消]`，chip 出现/消失带 fade 动画。

**发送按钮**：`↑` 箭头图标，仅有内容时出现，内嵌在 pill 右侧，`isSubmitting` 时显示 loading。

**props**（基本保持，移除 `submitError` 显示位置调整）：
```ts
interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  replyTarget?: ReplyTarget | null;
  onCancelReply?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  className?: string;  // 新增，供不同 layout 调整间距
}
```

---

### 5. `CommentSection`（重构）

**新增 prop**：

```ts
interface CommentSectionProps {
  targetType: "article" | "moment" | "guestbook";
  targetId: number;
  layout?: "modal" | "inline";  // 默认 "inline"
}
```

**layout 对布局的影响**：

```
modal 模式（弹窗场景）：
  ┌─────────────────┐
  │   CommentList   │  flex: 1, overflow-y: auto
  ├─────────────────┤
  │   CommentInput  │  shrink-0, border-top
  └─────────────────┘

inline 模式（页面内嵌）：
  ┌─────────────────┐
  │   CommentInput  │  shrink-0, border-bottom
  ├─────────────────┤
  │   CommentList   │  无固定高度，自然流
  └─────────────────┘
```

Section 本身不设高度，高度由外层 Shell 决定。

---

### 6. `CommentModal`（重构）

**结构**：

```
Backdrop（fixed inset-0, bg-black/45, backdrop-blur）
└── Sheet div（fixed bottom-0, bg-card, border-radius 20px 20px 0 0）
    ├── DragHandle（36×4px 圆角条，居中）
    ├── Header（flex, 居中标题 "评论"，右侧无按钮）
    ├── CommentSection(layout="modal")   ← 占 flex:1
    └── [手势由 useSheetGesture 注入 style]
```

**高度状态**：
- 默认：70% viewport height
- 展开：92% viewport height（上滑触发，border-radius 缩小）
- 收起：跟手 translateY，dismiss 时淡出

**动画**：
- 打开：`slideUp` keyframe（现有，保持）
- 手势跟手：`transform: translateY(Xpx)`，不改 height
- spring 弹回：CSS transition `cubic-bezier(.32,.72,0,1) 0.35s`
- dismiss：JS 动画（确保 `onDismiss` 在动画结束后调用）

**PC 适配**（当前弹窗在 md 断点已有卡片样式）：此次保持 `comment-modal.tsx` 现有 PC 样式不变，PC 弹窗重设计为后续独立任务。

---

### 7. `ArticleComments`（微调）

```tsx
<CommentSection targetType="article" targetId={articleId} layout="inline" />
```

仅增加 `layout="inline"` prop，其余不变。

---

## 文件变更清单

| 文件 | 操作 |
|---|---|
| `apps/web/hooks/use-sheet-gesture.ts` | 新建 |
| `apps/web/hooks/use-sheet-gesture.test.ts` | 新建 |
| `apps/web/components/comments/comment-replies.tsx` | 新建 |
| `apps/web/components/comments/comment-replies.test.tsx` | 新建 |
| `apps/web/components/comments/comment-item.tsx` | 重构 |
| `apps/web/components/comments/comment-item.test.tsx` | 更新 |
| `apps/web/components/comments/comment-input.tsx` | 重构 |
| `apps/web/components/comments/comment-input.test.tsx` | 更新 |
| `apps/web/components/comments/comment-section.tsx` | 重构 |
| `apps/web/components/comments/comment-section.test.tsx` | 更新 |
| `apps/web/components/comments/comment-modal.tsx` | 重构 |
| `apps/web/components/comments/comment-modal.test.tsx` | 更新 |
| `apps/web/components/article-detail/article-comments.tsx` | 微调 |
| `apps/web/components/article-detail/article-comments.test.tsx` | 更新 |

---

## 未来场景扩展路径（不在本次范围，仅作预留说明）

| 场景 | 新增内容 | 复用内容 |
|---|---|---|
| PC 弹窗 | `CommentDialog`（侧边/居中定位 Shell） | CommentSection + 全部 Primitives |
| 移动端内嵌 | `ArticleComments` 已支持 | CommentSection(layout="inline") |
| PC 内嵌 | `ArticleComments` 响应式调整 | CommentSection(layout="inline") |
| 留言板 | 新页面 + `CommentSection(targetType="guestbook", layout="inline")` | 全部复用 |

新增 Shell 时：只需提供容器 div，将 `<CommentSection>` 放入即可。无需修改任何 Primitive 或 Section 代码。

---

## 注释规范（针对 `useSheetGesture`）

hook 文件须包含：

1. **文件头**：完整状态机流程图（ASCII），标注所有节点和转换条件
2. **每个处理阶段**：`// [PHASE 1: touchstart]`、`// [PHASE 2: mode 判定]` 等编号注释
3. **每条防御策略**：说明解决的问题、影响的浏览器、代码位置
4. **关键判断条件**：注释说明为何选择当前阈值（如 8px、100ms、0.3、600px/s）
5. **弹回 vs 收起**：注释给出完整的决策树

目标：任何人阅读代码，无需参考本文档即可理解完整交互设计意图。
