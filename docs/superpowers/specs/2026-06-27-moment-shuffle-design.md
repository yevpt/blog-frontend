# 首页碎语模块「换一批」设计

日期：2026-06-27
范围：首页右侧栏碎语模块（`apps/web/components/moments/moments-section.tsx`）「换一批」按钮的随机抽样与去重实现。

## 背景

首页 [`MomentsSection`](../../../apps/web/components/moments/moments-section.tsx) 展示的 3 条碎语来自 SSR 阶段 [`app/page.tsx`](../../../apps/web/app/page.tsx) 对 `api.moments.listPublic({ page: 1, page_size: 3, user_id: BLOG_USER_ID })` 的调用——固定取博主（`BLOG_USER_ID`）碎语列表「第 1 页」，排序为置顶优先 + 时间倒序，每次刷新结果都一样。

模块右上角的「换一批」按钮（[moments-section.tsx:101](../../../apps/web/components/moments/moments-section.tsx:101)）目前未绑定任何事件，纯装饰，点击无效果。后端 `/moments` 接口（`MomentListReq`：`user_id` / `role_id` / `page` / `page_size`）也没有随机排序或排除已展示内容的能力。

## 目标

实现「换一批」的真实行为：

- 首屏仍是确定性的博主碎语（不变）。
- 点击「换一批」后随机抽取新的 3 条，抽样池为**全站公开碎语**（不限定博主本人，可能换出其他用户的碎语）。
- 同一次页面停留期间，尽量不重复展示已经随机出现过的内容；池子被「转完一圈」后允许重新出现（reshuffle），同时适配池子很小和持续增长两种规模。

## 设计

### 整体策略

不新增接口，**扩展现有 `GET /moments`**：新增可选 query 参数 `random`（布尔）+ `exclude_ids`（逗号分隔 ID 列表）。

- `random=true` 时后端忽略 `page`，在 `WHERE id NOT IN (exclude_ids)` 范围内随机抽 `page_size` 条；若排除后剩余数量 < `page_size`，**忽略 exclude 过滤、从全量池重新抽**（等价于转完一圈自动重新洗牌）。
- 置顶（`is_top`）碎语与普通碎语一起参与随机池，可能被再次抽中展示。
- `user_id` 保持可选：**首屏调用传 `user_id=BLOG_USER_ID`**（不变）；**换一批调用不传 `user_id`**，语义上即为全站公开碎语池，与 `/moments/feed?scope=all` 概念一致，不需要为「跨用户」单独新增参数。
- 响应仍是 `MomentPageResp`；`random=true` 时 `page`/`pages` 固定为 `1`（不再代表真实分页）。

### 改动范围

**后端（独立 Go 仓库，不在本仓库，需协调）**

- `/moments` 接口契约新增 `random`、`exclude_ids` 两个可选 query 参数，行为如上。

**本仓库前端**

1. [`packages/api/src/types/moment.ts`](../../../packages/api/src/types/moment.ts) `MomentListReq` 新增 `random?: boolean; exclude_ids?: number[]`。
2. [`packages/api/src/client.ts`](../../../packages/api/src/client.ts) `moments.listPublic` 序列化两个新参数（`exclude_ids` 逗号拼接）。
3. [`apps/web/app/api/moments/route.ts`](../../../apps/web/app/api/moments/route.ts) GET handler 透传 `random`/`exclude_ids`。
4. 新增 `apps/web/hooks/use-moment-shuffle.ts`，只服务于首页这一个按钮，不进入 `useMomentList`（该 hook 还被 `/moments` 独立页、个人主页复用，不应承担去重职责）：

   ```ts
   interface UseMomentShuffleOptions {
     pageSize: number;
     initialMomentIds: number[];
     onShuffled: (list: MomentItemResp[]) => void;
   }
   ```

   - 用 `useRef` 维护「最近展示过的碎语 ID」滑动窗口（FIFO，上限 30，约 10 批），初始值 = SSR 首屏 3 条的 ID（避免第一次换一批就摸到首屏内容）。
   - `shuffle()`：拼 `exclude_ids` 请求 `/api/moments?random=true&exclude_ids=...&page_size=3`（不传 `user_id`）；成功后将新 3 条 ID 并入窗口（超 30 从头部丢弃），通过 `onShuffled` 回调写回 `MomentsSection` 现有的 `setMoments`（[use-moment-list.ts:505](../../../apps/web/hooks/use-moment-list.ts:505) 已导出，复用现有列表状态，不重复造状态）。
   - 失败：与 `toggleLike` 同款模式，`addToast(getApiErrorMessage(err, "换一批失败，请稍后重试"), "error")`，按钮可重试，不影响已展示内容。
   - 暴露 `isShuffling` 供按钮 loading/禁用。

5. [`moments-section.tsx:101`](../../../apps/web/components/moments/moments-section.tsx:101) 给 `SidebarSectionAction` 接上 `onPress={shuffle}`，`isDisabled={isShuffling}`（仅请求中禁用，防止连点；不再按总数禁用——全站池几乎不可能 ≤3，也拿不到全站总数）；`refresh-cw` 图标在 `isShuffling` 时加 `animate-spin`。

### 跨用户内容的展示

[`MomentCard`](../../../apps/web/components/moments/moment-card.tsx) 已按每条碎语的 `moment.user_id === 当前登录用户` 逐条判断 `isOwner`（[moment-card.tsx:84](../../../apps/web/components/moments/moment-card.tsx:84)），头像/昵称/徽章也读的是 `moment.user`，不是假设固定博主身份。因此换一批换出其他用户的碎语时：

- 头像、昵称会正确显示为实际作者。
- 编辑/置顶/删除操作仅在 `isOwner` 为真时出现，其他用户的碎语自动隐藏这些按钮。
- 喜欢/评论对任意作者的碎语都生效（后端按碎语 ID 处理，与作者无关）。

组件层无需改动，仅需按上述 4、5 点接好数据流。

## 不在范围内

- 不改 `/moments/feed`（独立页 `/moments` 的 Tab 切换/排序逻辑不受影响）。
- 不做跨刷新/跨标签页的持久化去重（仅当前会话内存，刷新页面后重置）。
- 不改 `useMomentList` 内部分页逻辑。
- 不为「碎语来自其他用户」新增额外的 UI 文案/标识——作者身份已通过头像+昵称自然呈现。

## 测试

- `use-moment-shuffle.test.ts`：① 首次调用带上 SSR 初始 ID 做 `exclude_ids`；② 成功后窗口正确滚动（超 30 丢弃最旧的）；③ 失败时触发 toast、不改变已展示列表；④ 请求不携带 `user_id`。
- `moments-section.test.tsx` 补充：点击「换一批」触发请求并替换卡片；请求中按钮 `isDisabled`。

## 风险

- 后端实现在独立仓库，本次改动依赖后端配合上线 `random`/`exclude_ids` 参数，前后端需协调发布顺序（前端可先做好降级：接口未生效前调用失败时仅 toast 提示，不阻塞页面）。
- 全站池意味着换一批可能展示与博主无关的内容，与"博主碎语精选"的原始模块定位略有偏移——已与用户确认这是预期效果。
