# 用户详情页点赞内容 UI 设计

> 范围：`apps/web` 用户详情页 `/users/[id]` 的「点赞」Tab。
>
> 当前后端尚未提供用户点赞列表接口，本文先固定 UI、信息结构与建议接口模型，便于后续前后端对齐。

## 1. 目标

在个人详情页公开展示用户赞过的内容，覆盖：

- 文章
- 评论
- 留言
- 碎语
- 回复

「点赞」Tab 对访客公开可见。本人和访客看到同一套列表，不做隐私分叉。

## 2. 信息架构

采用「混合动态流」：

- 列表按点赞时间倒序排列。
- 顶部提供轻量筛选：`全部 / 文章 / 评论 / 留言 / 碎语`。
- 「评论」筛选包含评论与回复；回复不单独成为顶部筛选项。
- 卡片自身用类型标签精确说明内容类型：`赞过文章`、`赞过评论`、`赞过回复`、`赞过留言`、`赞过碎语`。

选择混合流的原因：

- 符合“TA 最近赞过什么”的阅读心智。
- 与现有个人页单列卡片、碎语时间线一致。
- 后端只需提供一个统一分页接口，前端只维护一套无限滚动列表。

## 3. 列表项设计

每个点赞列表项统一包含：

- 作者头像与昵称：内容原作者，不是个人页所属用户。
- 类型标签：如 `赞过回复`。
- 点赞时间：用户执行点赞的时间，不是内容发布时间。
- 主体内容摘要：文章标题/摘要，评论正文，留言正文，碎语正文，回复正文。
- 根内容入口：打开文章、打开碎语、打开留言板上下文等。
- 可选父级引用：仅评论/回复类需要。

### 3.1 文章

展示：

- 文章标题
- 文章摘要，两行内截断
- 可选封面缩略图
- 底部入口：`打开文章`

### 3.2 碎语

展示：

- 碎语正文摘要
- 可选图片缩略预览，保持轻量，不复刻完整碎语卡片的全部操作
- 底部入口：`打开碎语`

### 3.3 留言

展示：

- 留言作者
- 留言正文摘要
- 底部入口：`打开留言板`

### 3.4 评论

展示：

- 评论作者
- 评论正文摘要
- 引用根内容：文章标题或碎语摘要
- 底部入口：打开对应文章/碎语上下文

### 3.5 回复

回复作为独立点赞项展示，但必须带上下文，避免单句回复失去语义。

结构：

```text
作者 · ♥ 赞过回复 · 点赞时间
@被回复人 回复正文摘要

回复自评论/留言：
父评论或父留言摘要

来自文章/碎语/留言板：根内容标题或摘要
```

回复归入顶部「评论」筛选，但卡片标签显示 `赞过回复`。

## 4. 状态设计

### 空态

沿用当前个人页空态组件：

- 标题：`暂无点赞`
- 访客文案：`TA 还没有点赞过任何内容`
- 本人文案：`你还没有点赞过任何内容`

### 加载态

复用个人页/通知页的纵向 skeleton 节奏：

- 首屏显示 5-8 个列表项骨架。
- 加载更多使用现有 `SnippetScrollLoader` / `SnippetEndReached` 视觉。

### 删除态

后端若保留点赞记录但目标内容已删除：

- 卡片仍保留在时间线中。
- 类型标签正常展示。
- 主体正文显示 `内容已删除`。
- 根内容入口禁用或显示 `原内容已不可访问`。

若后端决定删除目标后连同点赞记录一起清理，前端无需展示删除态。

### 错误态

- 首屏失败：在 Tab 内容区显示 `加载失败，请稍后重试` + 重试按钮。
- 加载更多失败：列表尾部显示行内错误文案，不清空已有内容。

## 5. 建议后端接口模型

建议新增统一分页接口：

```text
GET /users/:id/likes?page=1&page_size=20&type=article|comment|guestbook|moment
```

`type` 可选；不传表示全部。`comment` 包含评论与回复。

建议响应：

```ts
interface UserLikedContentPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: UserLikedContentItemResp[];
}

type LikedContentFilter = "article" | "comment" | "guestbook" | "moment";
type LikedContentKind = "article" | "comment" | "reply" | "guestbook" | "moment";

interface UserLikedContentItemResp {
  id: number;
  liked_at: string;
  kind: LikedContentKind;
  filter: LikedContentFilter;
  author?: {
    id: number;
    username?: string;
    nickname?: string;
    avatar_url?: string;
    roles?: string[];
  };
  content: {
    id: number;
    title?: string;
    excerpt: string;
    cover_img_url?: string;
    deleted?: boolean;
  };
  parent?: {
    kind: "comment" | "guestbook";
    id: number;
    excerpt: string;
    deleted?: boolean;
  };
  root?: {
    kind: "article" | "moment" | "guestbook";
    id: number;
    title?: string;
    excerpt?: string;
    deleted?: boolean;
  };
  stats?: {
    like_count?: number;
    comment_count?: number;
  };
}
```

前端只依赖统一结构渲染列表，不在客户端拼接不同接口的数据。

## 6. 前端落地建议

新增业务组件位于：

```text
apps/web/app/users/[id]/_components/profile-likes-tab/
```

建议拆分：

- `profile-likes-tab.tsx`：Tab 容器，管理筛选、加载、空态。
- `profile-likes-virtual-list.tsx`：无限滚动列表。
- `liked-content-card.tsx`：统一列表项。
- `liked-content-format.ts`：类型标签、跳转地址、筛选映射。
- `constants.ts`：分页大小、空页常量。

UI 组件优先复用：

- `@repo/ui`：`Button`、`Badge`、`cn`。
- `@repo/icons`：`SvgIcon`，使用 `heart-fill`、`message-circle`、`link` 等已有图标。
- 头像复用 `UserAvatar`。
- 时间复用 `RelativeTime` / `formatDateTime`。
- 无限滚动参考 `ProfileMomentsVirtualList` 和 `NotificationVirtualList`。

## 7. 测试要求

实现时至少补：

- `user-profile-tabs.test.tsx`：点赞 Tab 从空态切到真实列表。
- `profile-likes-tab.test.tsx`：筛选切换、空态、加载失败、加载更多。
- `liked-content-card.test.tsx`：文章/评论/回复/留言/碎语五类渲染，重点覆盖回复上下文。
- `liked-content-format.test.ts`：筛选映射、标签文案、跳转地址。

## 8. 非目标

- 本设计不实现后端。
- 不在前端用多个旧接口拼接点赞列表。
- 不提供点赞记录隐私设置；当前需求为公开展示。
- 不在个人页中支持取消点赞操作，列表只负责展示与跳转。
