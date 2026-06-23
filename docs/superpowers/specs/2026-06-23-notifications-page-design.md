# 用户消息中心页面设计（/notifications）

日期：2026-06-23
状态：已确认设计，待生成实现计划

## 背景与现状

站内通知的基建已存在，本次只补「落地页」与缺失的客户端方法：

已有：

- 类型：`packages/api/src/types/notification.ts`（`NotificationItemResp` / `NotificationPageResp` / `NotificationListReq` / `NotificationUnreadCountResp` / `NotificationReadAllReq` / `NotificationReadResp`）
- 客户端方法：`api.notifications.unreadCount()`、`api.notifications.list(req)`
- Zustand store：`useNotificationStore`（仅 `unreadCount` / `hasLoaded`）
- 实时入口：`NotificationProvider`（SSE `/api/notifications/stream` + 角标刷新 + 右上角 toast 弹窗）
- 跳转兜底：`getNotificationHref(item)`（按 `root_type` 映射）
- 导航入口：用户菜单「我的消息」按钮 + 头像未读红点

缺失（本次交付）：

- 路由页面 `/notifications` 本体
- 客户端方法：标记单条已读、批量/全部已读、删除单条
- 入口与兜底中残留的 `/messages` 占位需改为 `/notifications`

## 目标

实现 `/notifications` 页面，支持：全部/未读筛选、加载更多分页、单条展示与操作（标记已读 / 删除 / 跳转）、批量操作（选中已读 / 全部已读），以及空 / 加载 / 错误态。

## 关键交互决策（已确认）

- 翻页：**加载更多按钮**（非 URL 分页、非无限滚动）
- 批量操作：**选择模式 + 常驻「全部已读」**
- 单条操作：**整条可点跳转 + 桌面 hover / 移动端常驻操作图标**
- 未读标记：**标题前内联圆点**（方案 A）
- 时间：**相对时间**（如「2 分钟前」）+ `title` 属性显示绝对时间
- 类型胶囊：**保留文案**（图标 + 彩色胶囊）

## 页面结构

容器沿用站内规范：`max-w-2xl mx-auto`，移动端为基准逐步增强。

```
消息中心页
├─ 头部
│  ├─ 标题「消息中心」+ 未读计数副标题（N 条未读 / 全部已读）
│  └─ 操作区：[选择] [全部已读]
├─ 筛选 Tab：全部 | 未读（未读带红色计数徽标）
├─ 通知列表（卡片纵向堆叠）
│  └─ 通知卡片 × N
├─ 加载更多 区（按钮 / spinner / 无更多时消失）
└─ 浮层：选择模式底部操作条（仅选择模式显示）
```

## 组件拆分

放在 `apps/web/components/notifications/`，页面路由放 `apps/web/app/notifications/page.tsx`。

- `notifications-page.tsx`（`'use client'`）：页面容器，持有筛选/列表/分页/选择模式状态，编排数据获取与操作。
- `notification-list.tsx`：渲染列表，处理空/加载/错误态分支。
- `notification-card.tsx`：单条卡片，含未读样式、类型图标/胶囊、相对时间、操作图标、选择模式勾选框。
- `notification-filter-tabs.tsx`：全部/未读 Tab。
- `notification-selection-bar.tsx`：选择模式底部操作条。
- `notification-type.ts`：纯函数，按 `type`/`root_type` 映射到 { 图标名, 胶囊文案, 胶囊配色 }。
- `use-notifications.ts`（Hook）：封装列表查询、加载更多、标记已读、删除、批量已读，并在写操作后同步 `useNotificationStore` 的 `unreadCount`。

复用 `@repo/ui` 的 `Button` 等基础组件、`@repo/icons` 的 `SvgIcon`，不写平行实现。

## 卡片视觉规范

- **未读**：标题前 6–7px 紫色（`primary`）内联圆点；卡片淡紫底（`primary/5` 量级）；标题 `font-medium` 前景色。
- **已读**：白底（`card`）、降饱和、标题转 `muted-foreground`、无圆点、不显示「标记已读」操作。
- **左侧**：36px 圆形类型图标（图标 + 同色系浅底）。
- **正文**：标题 + 类型胶囊一行；`content_excerpt` 两行截断（`line-clamp-2`）；底部一行相对时间 + 「来自 X」来源说明，`title` 存绝对时间。
- **右侧操作**：`check`（标记已读，仅未读显示）、`trash`（删除）。桌面 hover 显现、移动端常驻。
- 整条 `button`/可点区域：点击 = 先标记已读（若未读）再跳转。

### 类型映射（notification-type.ts）

按 `root_type` 为主、`type` 为辅。当前图标集可用项：`message-circle`、`heart`/`heart-fill`、`edit`、`bell`。

| root_type | 文案 | 图标 | 配色 |
|-----------|------|------|------|
| article | 评论/回复 | message-circle | 紫（primary） |
| moment | 碎语（赞/评论） | heart / message-circle | 粉 |
| guestbook | 留言 | edit | 灰/中性 |
| 其它/兜底 | 系统通知 | bell | 中性 |

胶囊文案取「评论 / 碎语 / 留言 / 通知」等短词。具体 `type` 细分（如点赞 vs 评论）在实现时据后端实际 `type` 值细化，未知值落到兜底。

## 数据流与操作

- 初始数据：页面为 `'use client'`，首屏在 effect 中调用 `api.notifications.list({ page:1, page_size, unread_only })`。（注：`apps/web` 约定 Server Component 直接取数，但本页交互态多、依赖登录态与实时刷新，采用客户端取数；与 `NotificationProvider` 同源策略。实现时确认是否用 SSR 首屏 + 客户端接管，默认客户端取数。）
- 加载更多：`page += 1` 追加 `list`，依据 `total` 与已加载条数判断是否还有更多。
- `page_size`：默认 20，最大 50（受后端约束）。
- 切换 Tab：重置 `page=1` 重新拉取，对应 `unread_only=true|false`。
- 标记单条已读：`PATCH /notifications/{id}/read` → 本地把该条 `is_read=true`、`unreadCount-1`。
- 删除单条：`DELETE /notifications/{id}` → 从列表移除；若原为未读则 `unreadCount-1`。
- 选中已读 / 全部已读：`POST /notifications/read-all`，body `NotificationReadAllReq`（`{ ids }` 或 `{ all: true }`）→ 对应条目置已读、刷新 `unreadCount`。
- 写操作后统一通过 store 的 `setUnreadCount` 同步角标（与 navbar、provider 一致）。

## 需新增的客户端方法（packages/api/src/client.ts）

在 `notifications` 命名空间下新增，使用 `fetchAuthed`：

- `read(id: number)` → `PATCH /notifications/{id}/read`，返回 `NotificationReadResp`
- `readAll(req: NotificationReadAllReq)` → `POST /notifications/read-all`，返回 `NotificationReadResp`
- `remove(id: number)` → `DELETE /notifications/{id}`（返回体待后端确认，默认无内容）

> 注意：路径前缀、HTTP 方法以后端实际实现为准，实现前与后端核对 `read-all` / 删除端点。

## 跳转规则（沿用并修正 getNotificationHref）

- `article` → `/articles/{root_id}`
- `moment` → `/snippets`（碎语详情若有锚点则补 `#id`，当前先到列表）
- `guestbook` → `/guestbook`
- 兜底：当前为 `/messages`，**改为 `/notifications`**

## 关联改动

1. `navbar-user-menu.tsx`：「我的消息」`navigate("/messages")` → `navigate("/notifications")`。
2. `notification-target.ts`：兜底 `/messages` → `/notifications`。
3. SEO：页面导出 `metadata`（标题「消息中心 | Yevpt's Blog」）。

## 次要状态

- **空状态**：居中 `bell` 图标 + 文案（全部：「这里还没有消息」；未读：「没有未读消息」）。
- **加载态**：3–4 个骨架卡片占位。
- **错误态**：居中提示 + `refresh-cw`「重试」按钮，重试重新拉当前 Tab 第一页。
- **加载更多**：进行中显示 spinner；无更多数据时按钮消失（可显示「没有更多了」）。

## 选择模式

- 点「选择」进入：每条卡片左侧出现勾选框，隐藏单条 hover 操作；头部「选择」变「取消」。
- 底部浮出操作条：「已选 N 条」+「标记已读」+「取消」。（避免 `position: fixed` 影响布局，用 sticky/普通流内置底。）
- 勾选框与未读圆点位置不冲突：圆点在标题前，勾选框在卡片最左，互不争位。

## 图标缺口（实现注意）

当前 sprite 无 `checkbox` / `checks`（双勾）/ `bell-off`。处理：

- 「选择」按钮：纯文字或复用 `check`。
- 「全部已读 / 选中已读」：复用 `check`。
- 空状态：复用 `bell`（无 `bell-off`）。
- 如需更贴切图标，按 `@repo/icons` 流程补充 sprite，不在 JSX 内手画 SVG。

## 测试（强制）

- `use-notifications.test.ts`：列表加载、加载更多、标记已读、删除、批量已读后的状态与 `unreadCount` 同步。
- `notification-card.test.tsx`：未读/已读样式、操作图标显隐、点击触发标记已读 + 跳转、选择模式勾选框。
- `notification-type.test.ts`：各 `root_type`/`type` 的图标与文案映射，含兜底。
- `page.test.tsx`：页面渲染、Tab 切换、空/加载/错误态分支。
- `packages/api/src/client.test.ts`：新增 `read` / `readAll` / `remove` 的路径与方法。
- 环境与 mock 配方见 writing-tests skill。

## 风险与未决

- `read-all` / 删除端点的实际路径与方法需与后端确认。
- 碎语/留言是否支持锚点跳转到具体条目；当前先跳列表页。
- 首屏 SSR vs 纯客户端取数的最终取舍（默认客户端）。
- 图标缺口是否补 sprite 由实现时决定。
