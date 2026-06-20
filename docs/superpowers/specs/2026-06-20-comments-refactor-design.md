# 评论模块重构设计

日期：2026-06-20
范围：`apps/web/components/comments/` 及其唯一 inline 消费方

## 背景与问题

逻辑层已分得很干净（`useCommentSectionState` / `useCommentList` / `useCommentSubmit` / `useCommentLike` 等 hook，以及 `CommentListView` / `CommentItem` / `CommentReplies` 等展示组件）。

耦合集中在单一文件 `comment-section.tsx`，它通过 `layout: "modal" | "inline"` 把三类互不相干的东西缝进一个组件：

1. 共享逻辑（调用状态 hook + 渲染列表）；
2. **仅 modal 用到**的滚动/尺寸机制：`internalScrollRef`、`mergeRef`、`ResizeObserver`、`scrollToListTop`、`scrollToComment`、`onContentResize` 桥接；
3. 两套差异极大的 UI：modal 是「可滚动列表 + 底部 pill 输入」，inline 是「顶部富文本输入 + 内联回复提示 + 列表」。

此外，「正在回复 @xx 取消」提示条在 `comment-input.tsx`（pill）和 inline 分支里各手写了一份，重复。

## 目标

- 拆分 modal 与 inline 两套视图，消除 `if (layout)` 分支。
- 逻辑与 UI 彻底分离：状态 hook 为单一来源，视图只负责呈现。
- modal 专属机制下沉到独立 hook，inline 不再背负无关代码。
- 目录按职责分层，提升可读性、可维护性、可扩展性。
- **行为零变更**：所有动效、手势、滚动定位、布局逐字保留。

## 目标目录结构

```
comments/
  index.ts                       # 对外导出：InlineComments / CommentModal / CommentReplies / skeletons
  views/
    inline-comments.tsx          # comment-section 的 inline 分支 → 独立组件（导出）
    modal-comments.tsx           # comment-section 的 modal 分支 → 容器视图（内部，仅 CommentModal 用）
    comment-modal.tsx            # CommentDialog + CommentSheet 派发；内部改用 ModalComments
  parts/                         # 纯展示，modal/inline 共用
    comment-list.tsx             # comment-list-view.tsx 改名（导出名 CommentList）
    comment-item.tsx
    thread-comment-item.tsx
    comment-replies.tsx
    comment-skeleton.tsx
  inputs/
    pill-comment-input.tsx       # comment-input.tsx 改名（导出名 PillCommentInput）
    rich-comment-input.tsx
    reply-banner.tsx             # 新增：抽出重复的「正在回复」提示条
  hooks/
    use-comment-section-state.ts # 从 apps/web/hooks/ 移入，与视图共置
    use-comment-scroll.ts        # 新增：modal 专属滚动 + ResizeObserver 逻辑
```

## 各单元职责

- **`useCommentSectionState`**（逻辑层，单一来源）：保持现有 API 不变，供两个 view 复用。仅文件位置移动。
- **`useCommentScroll`**（新）：封装 `internalScrollRef`、`mergeRef`（合并外部 scrollRef + ResizeObserver）、`scrollToListTop`、`scrollToComment`、`onContentResize` 桥接。返回 `{ scrollRef, scrollToListTop, scrollToComment }`。仅 `ModalComments` 使用。
- **`InlineComments`**（新，替代 `CommentSection layout="inline"`）：顶部 `RichCommentInput` + `submitError` + `ReplyBanner` + `CommentList`。调用 `useCommentSectionState`，不传滚动回调。
- **`ModalComments`**（新，替代 `CommentSection layout="modal"`）：可滚动容器（绑定 `useCommentScroll` 的 ref）+ `CommentList` + 底部 `PillCommentInput`。把 scroll hook 的回调接入 `useCommentSectionState`。保留 props：`scrollRef`、`onContentResize`、`onCommentAdded`。
- **`ReplyBanner`**（新）：`{ toUsername, onCancel }` → 「正在回复 @xx 取消」。`PillCommentInput` 与 `InlineComments` 共用。
- **展示组件**（`CommentList` / `CommentItem` / `ThreadCommentItem` / `CommentReplies` / skeleton）：仅移动到 `parts/`，逻辑不变。

## 对外 API 变更

- 删除 `layout` prop 与 `CommentSection` 组件。
- `index.ts` 导出 `InlineComments`（替代旧 `CommentSection`）、`CommentModal`、`CommentReplies`、`CommentItemSkeleton` / `CommentListSkeleton`。
- 唯一 inline 消费方 `apps/web/components/article-detail/article-comments.tsx`：`<CommentSection targetType targetId .../>` → `<InlineComments .../>`。
- modal 消费方（snippets-list / snippets-section / article-section）通过 `CommentModal`，不受影响。
- `CommentReplies` 在 `guestbook-item.tsx` 的直接引用：经 `index.ts` 重导出，import 路径不变。

## 测试影响（随文件改名/移动同步更新，作为回归护栏）

- `comment-input.test.tsx` → `inputs/pill-comment-input.test.tsx`
- `comment-item.test.tsx` / `thread-comment-item.test.tsx` / `comment-replies.test.tsx` / `comment-skeleton.test.tsx` → `parts/`
- `rich-comment-input.test.tsx` → `inputs/`
- `comment-modal.test.tsx` → `views/`
- `comment-section.test.tsx` → 按视图拆为 `views/inline-comments.test.tsx` 与 `views/modal-comments.test.tsx`
- `apps/web/hooks/use-comment-section-state.test.ts` → 随 hook 移入 `comments/hooks/`
- 新增：`hooks/use-comment-scroll.test.ts`、`inputs/reply-banner.test.tsx`

## 验收标准

- `comment-section.tsx` 不再存在；无 `layout` 分支残留。
- modal/inline 两条路径行为与重构前一致（动效、手势、滚动、富文本）。
- 全量 `pnpm --filter web test` 通过；`tsc` 无类型错误；无 `any`。

## 非目标（YAGNI）

- 不改后端请求、不改状态 hook 的对外行为、不动 `@repo/*` 包、不引入新依赖。
- 不为 guestbook 等其它 targetType 增加新视图。
