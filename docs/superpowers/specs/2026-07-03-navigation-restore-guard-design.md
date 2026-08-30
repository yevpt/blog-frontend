# 导航来回恢复态（前进关闭 / 后退恢复）设计文档

## 背景

`docs/superpowers/plans/2026-07-03-persist-comment-ui-state.md` 已经修复了"点击站内 `<Link>` 跳走再返回，评论弹窗/回复展开态丢失"的问题，做法是把这些 UI 状态从页面级 `useState` 迁移到 Zustand store，让它们脱离页面组件树的挂载/卸载生命周期。

上线后发现三个延伸问题，都是这次修复暴露出来的新诉求：

1. **评论弹窗**：现在是全局挂载的，所以点击弹窗内部的用户头像跳到个人详情页后，弹窗还跟着显示在新页面上。期望：跳走时弹窗应该自动隐藏，只有通过"返回"回到原页面时才重新显示。
2. **留言板 / 评论区的回复、编辑输入框**：这些状态目前还是纯本地 `useState`（上次修复明确排除在范围外），跳走再返回后没有恢复——包括展开状态和已经输入的草稿内容。
3. **友邻页"暂别友邻"展开区块**：同样是纯本地 `useState`，跳走再返回后展开态没有恢复。

进一步讨论后明确了一条贯穿三处的规则：**只有"从页面 A 前进一步到页面 B，再通过后退动作回到页面 A"这一种严格的来回模式才需要恢复；只要中途再发生一次前进导航（不管目的地是哪里，哪怕是点导航栏链接或输入 URL 直接跳回原来的页面），原来记的状态就整体作废。**

## 目标

- 评论弹窗：前进导航时自动隐藏（保留数据），仅当通过后退/前进按钮精确回到打开弹窗的那个页面时才恢复显示；一旦发生"深度跳转"（连续第二次前进导航），弹窗状态彻底作废。
- 留言板 / 评论区回复、编辑输入框：展开状态 + 已输入草稿，在同样的"前进一步、后退一步"窗口内跨路由保留；深度跳转后作废。
- 友邻页"暂别友邻"展开态：同上，跨路由保留，深度跳转后作废。
- 三处共用同一套"是否应该恢复"的判断逻辑，不各自维护一份。

## 架构：全局单槽位导航守卫

核心是一个**全局唯一、模块级的"待恢复槽位"**（同一时刻至多记一份），由一个新增的、只挂载一次的 `NavigationRestoreGuard` 组件维护，取代"每个 store 各自记自己打开时的 pathname"的思路——因为"要不要恢复"这个判断本身要跨三个 store 共享，且严格依赖导航的**方向**（前进 vs 后退），不是某个具体状态自己能判断的。

### 判断规则

- **发生前进导航**（`pathname` 变化，且不是由 `popstate` 触发的）：
  - 若槽位非空（说明上一次记的还没被消费）→ **判定为深度跳转**：槽位内容作废，同时通知三处 store "该清的清"（弹窗彻底关闭清空、草稿全部丢弃、友邻展开重置为收起）。
  - 把槽位重新写成"刚离开的那个页面"（不管这次前进导航要去哪），同时让弹窗执行"隐藏但保留数据"。草稿 / 友邻展开态不需要额外的隐藏动作——它们所在的组件本来就会随页面卸载自然消失，只是数据还留在 store 里。
- **发生后退/前进按钮触发的 `popstate`**（浏览器的后退/前进按钮、移动端页面左上角的"返回"按钮、代码里调用 `router.back()`/`history.back()` 都属于这一类——它们最终都会走 History API，触发原生 `popstate` 事件，不需要分别处理）：
  - 若槽位记的页面正好等于当前 `window.location.pathname` → 消费掉这个槽位：弹窗恢复显示；草稿 / 友邻展开态不需要主动做什么，对应组件重新挂载时会自己从 store 里读到没被清空的数据。
  - 若对不上 → 视为链路已改变，同样触发"该清的清"，槽位清空。

这条规则天然覆盖了"点导航栏链接/输入 URL 跳回原页面"的场景：因为这仍然是一次**前进导航**，只会走"槽位非空 → 作废"这条分支，不会去检查目的地是否等于槽位记的页面——只有 `popstate` 才会做"是否匹配"的判断。

### 涉及的三个 store

**`useCommentModal`**（已存在，需要修改）新增：

- `isVisible: boolean` —— 当前是否渲染显示；`GlobalCommentModal` 的渲染条件从"有 target 就渲染"改为"有 target 且 `isVisible`"。
- `hide()` —— 只把 `isVisible` 置 `false`，保留 `targetType`/`targetId`/`onCommentAdded`。
- `show()` —— 只把 `isVisible` 置 `true`。
- `open()` 逻辑不变，额外把 `isVisible` 置 `true`；`close()`（用户主动点 × 关闭）逻辑不变，清空一切包括 `isVisible`。
- 不需要在 store 里记 `openedPathname`——"这次导航要不要恢复"完全由导航守卫的全局槽位决定，`useCommentModal` 本身不需要知道 pathname。

**`useInlineEditorStore`**（新增）：管理留言板 / 评论区所有"正在回复""正在编辑"输入框的展开态和草稿内容，用一个字符串 key 统一管理（key 由调用方按"作用域 + 目标 ID + 回复或编辑"拼出，比如某条留言的回复框、某条评论的编辑框、某条子回复的回复框，具体格式在实施计划里定）：

```ts
interface InlineEditorEntry {
  isOpen: boolean;
  content: string;
}
interface InlineEditorStore {
  editors: Record<string, InlineEditorEntry>;
  open: (key: string, initialContent?: string) => void;
  setContent: (key: string, content: string) => void;
  close: (key: string) => void; // 用户主动取消：删掉这个 key
  submitSuccess: (key: string) => void; // 提交成功：删掉这个 key
  discardAll: () => void; // 导航守卫触发：清空全部 key
}
```

覆盖范围：留言板顶层留言（`guestbook-item.tsx`）、文章/碎语评论顶层评论（`comment-item.tsx`）、回复线程里的每条回复（`comment-replies.tsx` 的 `ReplyItem`）——这三处目前都各自维护 `isReplying`/`isEditing` 两个布尔值 + `InlineReplyEditor` 内部自己的草稿 `useState`，全部改接这个 store。

`InlineReplyEditor` 组件需要从"不受控（只在挂载时读一次 `initialValue`）"改成"受控"（`value`/`onChange` 由调用方从 store 读写），这样草稿才能在组件卸载后依然留在 store 里，重新挂载时原样读回来。

除了导航守卫触发的整体清空，还有两条独立的精确清理路径（跟"该 key 关联的内容已经不需要了"对应，不依赖导航）：

- 用户主动点"取消"→ `close(key)`
- 提交成功 → `submitSuccess(key)`
- 评论/回复/留言被删除成功后，顺手清掉它对应的 reply-key 和 edit-key（内容都没了，草稿条目没有留着的意义）

**`useFriendLinksPausedStore`**（新增）：结构最简单，只有一个全局布尔值（页面上只有一个"暂别友邻"区块，不需要按 key 区分）：

```ts
interface FriendLinksPausedStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  reset: () => void; // = setOpen(false)，供导航守卫调用
}
```

### `NavigationRestoreGuard`

新增一个不渲染任何内容的 `"use client"` 组件，挂载在 `apps/web/app/providers/global-modals.tsx` 里（跟同样是"副作用型、无视觉输出"的 `OAuthResultHandler` 放在一起），全局只有一份实例。内部用 `usePathname()` 监听路径变化 + `window.addEventListener("popstate", ...)` 监听后退/前进按钮，按上面的规则驱动三个 store 的 `hide`/`show`/`discardAll`/`reset`/`close`。

需要一个 ref 标记来区分"这次 `pathname` 变化是不是由 `popstate` 引起的"（`popstate` 处理函数里先置位，pathname 变化的 `useEffect` 里读到即消费掉，避免同一次后退导航被误判成一次新的前进导航）。

## 数据流示例

**场景一：弹窗前进关闭、后退恢复**

1. 首页打开某篇文章的评论弹窗（`isVisible: true`）
2. 点弹窗内用户头像 → 前进导航到 `/users/456` → 守卫发现槽位是空的 → 槽位记为"首页"，弹窗 `hide()`（`isVisible: false`，`targetType`/`targetId` 保留）
3. 点浏览器后退 → `popstate` 触发 → 当前路径变回首页，跟槽位记的一致 → 弹窗 `show()`，槽位清空

**场景二：深度跳转作废**

1. 首页展开某条评论的回复弹窗
2. 前进到用户详情页 → 槽位记为"首页"，弹窗隐藏
3. 又前进到碎语页 → 守卫发现槽位非空 → 判定深度跳转 → 弹窗 `close()`（彻底清空），槽位换成记"用户详情页"
4. 从碎语页后退，回到用户详情页 → 槽位匹配，但此时弹窗已经在第 3 步被 `close()` 清空，没有内容可恢复；这一步的"恢复"动作本身不报错，只是没有实际效果

**场景三：留言板回复框保留草稿**

1. 留言板某条留言点"回复"，输入了一半内容
2. 前进到用户详情页 → 该留言组件卸载，但 store 里 `editors["guestbook-item:123:reply"]` 还留着 `{isOpen: true, content: "写了一半的内容"}`
3. 后退回到留言板 → 组件重新挂载，从 store 读到 `isOpen: true` → 回复框自动展开，`content` 原样填充，可以接着写

## 测试策略

`NavigationRestoreGuard` 是这次新增里风险最高的一块，需要在测试里模拟真实的 `pushState`/`popstate` 序列：用 `vi.mock("next/navigation")` 把 `usePathname()` 换成测试可控的返回值（每次"导航"后改变 mock 返回值并 `rerender`），配合手动 `window.dispatchEvent(new PopStateEvent("popstate"))` 模拟后退/前进按钮，断言三个 store 的最终状态是否符合"前进隐藏、精确后退恢复、深度跳转作废"的规则。三个 store 本身的单元测试（`discardAll`/`hide`/`show`/`reset` 等纯状态变更）按现有 `use-comment-modal.test.ts`/`use-comment-replies-store.test.ts` 的模式写即可，不需要涉及导航模拟。

`InlineReplyEditor` 从不受控改受控后，其自身测试需要更新为传入 `value`/`onChange` props；三个调用方（`comment-item.tsx`、`guestbook-item.tsx`、`comment-replies.tsx`）的现有测试大量断言了 `isReplying`/`isEditing` 相关交互，迁移到 store 后这些测试需要跟这次 Task 3-6 迁移评论弹窗时同样的方式更新（mock `useInlineEditorStore`，断言调用参数而不是断言 DOM）。

## 范围外

- 弹窗、草稿、友邻展开态之外的其他本地 `useState`（比如点赞的乐观更新状态、加载中状态等）不在本次范围内。
- 不做 `localStorage`/`sessionStorage` 持久化——所有状态仍然是纯内存 Zustand store，硬刷新页面会丢失，这跟已经上线的评论弹窗/回复展开态修复保持一致。
- 不改变浏览器地址栏——整个方案不引入任何 URL 查询参数或 History API 的 `state` 写入，只读取 `pathname` 和监听 `popstate`。
