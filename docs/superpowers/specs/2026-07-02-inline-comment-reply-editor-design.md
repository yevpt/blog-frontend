# 评论区/留言板内联回复编辑器设计

日期：2026-07-02
范围：`apps/web/components/comments/`（不含 `views/comment-modal.tsx` 与 `views/modal-comments.tsx`）、`apps/web/components/guestbook/`、`apps/web/hooks/use-comment-submit.ts`、`apps/web/hooks/use-comment-edit.ts`、`apps/web/hooks/use-guestbook-submit.ts`

## 背景与问题

评论区（`InlineComments`，文章详情页）和留言板（`GuestbookPage`）目前的回复/编辑体验是：点击某条评论/回复的「回复」或「编辑」按钮 → 把该评论/回复设为分区级唯一的 `replyTarget`/`editTarget` → 把页面滚动到列表顶部固定的 `RichCommentInput` 实例（`use-comment-section-state.ts` 的 `handleReply`/`handleEditComment`/`handleEditReply` + `onScrollToEditor`）。

这个模式的问题：

1. 编辑器和被回复内容不在同一视觉位置，用户需要来回滚动确认「回复的是谁」。
2. 分区级只有一份 `replyTarget`/`editTarget`/`content`，同一时刻只能操作一条评论，点开新的会打断正在编辑的旧的。

留言板的「编辑留言」场景已经不走这套机制，而是每条留言（`GuestbookItem`）自己持有 `isEditing`/`editContent` 本地 state，内联渲染 `RichCommentInput` 替换展示态，提交走父级传入的 `onEdit(id, content): Promise<boolean>`。本设计把这个已验证的模式推广到「回复评论」「回复留言」「编辑评论」「编辑回复」全部四种场景。

`CommentModal`（`views/comment-modal.tsx`/`views/modal-comments.tsx`，用于「动态/朋友圈」的底部固定聊天式弹窗评论）保持现状，不在本次范围内——已用现有的 `replyTarget`/`editTarget` + 底部固定 `PillCommentInput` 机制，不存在「跳来跳去」的问题。

## 目标

- 点击评论/回复的「回复」「编辑」，编辑器直接内联出现在该评论/回复下方（原地展开），不再滚动到共享编辑器。
- 允许同时展开多个回复/编辑框，互不干扰、互不打断。
- 顶层「发表新评论」入口位置不变，继续复用现有 `content`/`handleSubmit` 机制。
- 不影响 `CommentModal` 弹窗场景的现有行为。

## 状态模型变更

移除分区级共享的「当前唯一回复/编辑目标」概念（`replyTarget`/`editTarget` 不再驱动内联场景的渲染位置），改为状态下放到具体的评论/回复条目组件本地：

- `CommentItem`（`parts/comment-item.tsx`）：新增本地 `isReplying: boolean` + `replyContent: string`（回复该评论本身）；编辑逻辑从「把 `EditTarget` 交给父级」改为本地 `isEditing: boolean` + `editContent: string`（参照 `GuestbookItem` 现有模式）。
- `ReplyItem`（`parts/comment-replies.tsx` 内部组件）：新增本地 `isReplying`（回复该条回复）+ `isEditing`（编辑该条回复），逻辑同上，完全局部化，不需要向 `CommentReplies`/`CommentItem` 上报。
- `GuestbookItem`（`guestbook/guestbook-item.tsx`）：编辑内联已存在；新增等价的回复内联 `isReplying`/`replyContent`。

三处的「回复框」渲染都要挪出 `hasReplies &&` 之类的条件判断之外（0 条回复时也要能展开回复框，因为可能是第一条回复）。

编辑器组件本身（`RichCommentInput`，包装 `@repo/editor` 的 `RichEditor`）已经是纯受控组件（`value`/`onChange`/`onSubmit`），天然支持被多处实例化，不需要改造。

## 组件对父级的新回调契约

用「提交并处理副作用，返回是否成功」的细粒度回调替代「设置 target 交给父级统一处理」：

```ts
onSubmitReply: (commentId: number, parentReplyId: number | undefined, content: string) =>
  Promise<boolean>;
onSubmitEditComment: (commentId: number, content: string) => Promise<boolean>;
onSubmitEditReply: (replyId: number, parentReplyId: number, commentId: number, content: string) =>
  Promise<boolean>;
```

与现有 `onDelete`/`onEdit`（guestbook）风格一致。成功后由内联编辑器自己收起（`isReplying`/`isEditing` 置 `false`，清空本地 content）；失败时保持展开、内容不丢，交由 hook 内部的 toast 提示错误原因。

## Hook 层改动

### `use-comment-section-state.ts`（`InlineComments` 与 `CommentModal` 共用）

保留现有导出（`replyTarget`、`editTarget`、`handleReply`、`handleCancelReply`、`handleEditComment`、`handleEditReply`、`handleCancelEdit`、`handleSubmit` 等）不变——`ModalComments` 继续依赖这套机制，行为零变更。

新增三个函数，内部复用已有的 `submitReply`/`editComment`/`editReply`/`incrementReplyCount`/`setPendingReplies`/`updateComment`/`setEditedReplies`：

- `handleReplySubmit(commentId, parentReplyId, content): Promise<boolean>`
- `handleEditCommentSubmit(commentId, content): Promise<boolean>`
- `handleEditReplySubmit(replyId, parentReplyId, commentId, content): Promise<boolean>`

`InlineComments` 改为消费这三个新函数（通过 `CommentList` → `CommentItem` → `ReplyItem` 透传），不再调用 `handleReply`/`handleEditComment`/`handleEditReply`/`onScrollToEditor`；顶层发表新评论继续用现有 `content`/`setContent`/`handleSubmit`（此时 `replyTarget`/`editTarget` 对 `InlineComments` 始终为 `null`，`handleSubmit` 的编辑/回复分支天然不会被触发）。

`use-comment-scroll.ts` 的 `scrollToComment`（提交后滚回原评论）只保留给 `ModalComments` 用；`InlineComments` 里 `onScrollToEditor` 相关的 `editorRef`/`focusNonce`/`scrollIntoViewBelowFixedHeader` 也只保留给顶层「发表新评论」这一个编辑器用。

### `guestbook-page.tsx`

同理：移除 `replyTarget`/`setReplyTarget`、`replyEditTarget`/`setReplyEditTarget`、`scrollToEditor`/`focusNonce`（这些只服务于「回复」场景，「编辑」本来就没用它们）；新增等价的 `handleReplySubmit`/`handleEditReplySubmit`，内部复用已有的 `submitReply`/`editReply`/`incrementReplyCount`/`setPendingReplies`/`setEditedReplies`。顶层「发表新留言」的 `GuestbookInputBar` 保持原位，只处理新留言提交（`submitEntry`），不再兼管回复。

### ⚠️ 并发提交前置修复（阻塞项，必须先做）

`use-comment-submit.ts`、`use-comment-edit.ts`、`use-guestbook-submit.ts` 三个文件里，`submitComment`/`submitReply`/`editComment`/`editReply`/`submitEntry`/`editEntry` 各自都有一把**全局唯一**的 `isSubmittingRef`/`isEditingRef` 互斥锁：

```ts
if (isSubmittingRef.current) return null; // 静默丢弃，无报错无提示
```

这是在「同一时刻分区内只有一个编辑器」的前提下写的合理防抖。允许同时展开多个内联编辑器后，这把锁会导致：用户同时给评论 A、评论 B 提交回复，后发出的那个请求被直接吞掉且没有任何提示。

修复方式：删除这把全局锁（`isSubmittingRef`/`isEditingRef` 及其判断分支），双击/重复提交防护交给各内联编辑器自己的本地 `isSaving` state（提交中禁用自身的提交按钮，与 `GuestbookItem` 现有编辑逻辑一致）；精确去重交给已有的幂等键机制（`useIdempotencyKey`，按 `fingerprint` 区分不同请求，不受并发影响）。

这三个 hook 由 `CommentModal`/`ModalComments` 共用，去掉全局锁后 modal 场景不受影响——它的提交按钮本来就靠 hook 返回的 `isSubmitting` 禁用，全局锁只是冗余的第二道防线。

`isSubmitting`/`isEditing` 这两个返回值本身继续保留（供 modal 使用），只是不再作为"拒绝并发调用"的判断依据。

## 不动的部分

- 顶层「发表新评论」/「发表新留言」输入框的位置与机制。
- `views/comment-modal.tsx`、`views/modal-comments.tsx`、`inputs/pill-comment-input.tsx`——「动态/朋友圈」弹窗评论完全不改。
- 评论/回复的数据结构、列表分页、点赞、删除逻辑。
- `RichCommentInput`/`RichEditor` 组件本身。

## 测试影响

- `parts/comment-item.test.tsx`：新增内联回复框展开/提交/收起、内联编辑替换展示态的用例；原有依赖 `onReply`/`onEditComment` 参数断言的用例要跟着新回调签名调整。
- `parts/comment-replies.test.tsx`（如不存在需新建）：`ReplyItem` 内联回复/编辑的用例，以及「同时展开两条不同回复的编辑框互不干扰」。
- `views/inline-comments.test.tsx`：移除对 `onScrollToEditor`/`focusNonce` 回复场景的断言（顶层编辑器的发表新评论场景保留），改为断言内联回调正确透传。
- `hooks/use-comment-section-state.test.ts`：新增 `handleReplySubmit`/`handleEditCommentSubmit`/`handleEditReplySubmit` 的用例；`replyTarget`/`editTarget` 相关旧用例保留（覆盖 modal 路径）。
- `guestbook-item.test.tsx`：新增内联回复用例，仿照现有编辑用例写法。
- `guestbook-page.test.tsx`：同步移除 `replyTarget` 相关断言，新增新函数用例。
- `hooks/use-comment-submit.test.ts`、`hooks/use-comment-edit.test.ts`、`hooks/use-guestbook-submit.test.ts`：新增「两次不同目标的并发调用都能成功返回」的用例；删除/更新原先断言「并发调用第二次返回 null」的用例（如果存在）。

## 验收标准

- 评论区、留言板中点击「回复」/「编辑」，编辑器原地展开在对应评论/回复下方，无滚动。
- 可同时展开多个回复/编辑框，各自独立提交、互不清空。
- 并发提交两条不同评论的回复，均能成功发出，无静默丢失。
- `CommentModal` 弹窗场景行为与改造前一致。
- `pnpm --filter web test` 全量通过；`tsc` 无类型错误；无 `any`。

## 非目标（YAGNI）

- 不引入 Context/Zustand 等新状态方案（本地 `useState` 已够用）。
- 不改造 `CommentModal`/`ModalComments`/`PillCommentInput`。
- 不改后端接口、不新增字段。
- 不做「回复框内容离开页面后持久化草稿」之类的增强。
