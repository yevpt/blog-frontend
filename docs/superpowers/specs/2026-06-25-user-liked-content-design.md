# 用户详情页点赞内容 UI 设计

> 范围：`apps/web` 用户详情页 `/users/[id]` 的「点赞」Tab。
>
> 后端已提供统一分页接口；本文固定 UI、信息结构与前端落地方式，便于直接实现。
>
> Demo / 方案路径：`docs/superpowers/specs/2026-06-25-user-liked-content-design.md`

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

## 9. 可直接交给前端的还原提示词

请在 `apps/web` 用户详情页 `/users/[id]` 实现「点赞」Tab，按本方案还原 UI。当前个人页结构是 `max-w-2xl` 页面容器内放一张 `Card`，`UserProfileTabs` 已有 `资料 / 碎语 / 点赞` 顶部 Tab 和滑动下划线；不要重做外层页面，只替换 `likes` Tab 当前的空态占位。

参考路径：

- 方案 / demo 说明：`docs/superpowers/specs/2026-06-25-user-liked-content-design.md`
- 入口：`apps/web/app/users/[id]/_components/user-profile-tabs.tsx`
- 碎语 Tab 参考：`apps/web/app/users/[id]/_components/profile-moments-tab/profile-moments-tab.tsx`
- 无限滚动参考：`apps/web/app/users/[id]/_components/profile-moments-tab/profile-moments-virtual-list.tsx`
- 空态参考：`apps/web/app/users/[id]/_components/profile-tab-empty-state.tsx`
- 页面容器参考：`apps/web/app/users/[id]/_components/user-profile-page.tsx`

### 视觉目标

点赞 Tab 是一个公开的“TA 最近赞过什么”的动态流。整体应轻、安静、可扫读，和现有个人页 Card、碎语 Tab 的密度一致。不要做营销式大卡片，不要做独立落地页，不要把卡片套卡片。

布局：

- 外层仍在用户详情页的 `Card` 里。
- Tab 内容区顶部先放筛选条，再放列表。
- 内容区横向内边距与碎语 Tab 接近：移动端 `px-3`，桌面不额外撑宽。
- 列表单列，项与项之间用 `border-b border-border/40` 分隔，最后一项不需要重边框。
- 首屏不要额外标题，用户已经在「点赞」Tab 内。

### 顶部筛选条

筛选项固定为：

```text
全部 / 文章 / 评论 / 留言 / 碎语
```

交互与样式：

- 放在列表上方，`sticky` 不是必须；优先保持简单。
- 横向排列，移动端允许横向滚动，不换行。
- 使用轻量 segmented / pill 风格：整体不是大卡片，按钮高度约 32px。
- 当前筛选：`bg-primary/10 text-primary`，可加细边框 `border-primary/15`。
- 非当前筛选：`text-muted-foreground hover:text-foreground hover:bg-muted/60`。
- 切换筛选时保留在当前 Tab，不跳页面；列表重置到第一页。
- `评论` 筛选包含评论和回复，回复不单独作为筛选项。

### 列表卡片

每条点赞项是轻量信息块，不使用大圆角卡片。推荐结构：

```text
[头像]  作者昵称   [赞过文章/评论/回复/留言/碎语]   3小时前
        主体标题或正文摘要，最多 2-3 行
        可选：引用/来源上下文
        底部：打开文章 / 打开碎语 / 查看上下文
```

具体视觉：

- 左侧头像 36px，移动端也保持 36px。
- 第一行：昵称 `text-sm font-medium text-foreground`，类型 Badge 紧跟昵称，时间放右侧或同排末尾，使用 `text-xs text-muted-foreground`。
- 主体正文：`text-sm leading-relaxed text-foreground`，最多 2-3 行截断。
- 辅助上下文：`text-xs/text-sm text-muted-foreground`，不要抢主视觉。
- 卡片主区域可点击，跳到对应根内容；内部按钮或链接要阻止冒泡。
- 不提供取消点赞操作，这个列表只负责展示与跳转。

类型 Badge 文案：

```text
article   -> 赞过文章
comment   -> 赞过评论
reply     -> 赞过回复
guestbook -> 赞过留言
moment    -> 赞过碎语
```

Badge 色彩建议：

- 文章：`bg-sky-500/10 text-sky-600 dark:text-sky-300`
- 评论 / 回复：`bg-violet-500/10 text-violet-600 dark:text-violet-300`
- 留言：`bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`
- 碎语：`bg-rose-500/10 text-rose-600 dark:text-rose-300`

### 各内容类型

文章：

- 主体第一行优先显示 `content.title`。
- `content.excerpt` 作为摘要，最多两行。
- 有 `cover_img_url` 时，右侧显示 72x54 缩略图，`object-cover rounded-md`；移动端可以 64x48。
- 底部入口文案：`打开文章`。

碎语：

- 主体显示 `content.excerpt`，最多三行。
- 当前接口只给轻量摘要，不复刻完整 `SnippetCard`。
- 若后续有图片字段，可最多展示 3 张小缩略图；现在不要为了图片额外请求详情。
- 底部入口文案：`打开碎语`。

留言：

- 主体显示留言正文摘要。
- 底部入口文案：`查看留言` 或 `打开留言板`。
- 如果根对象为留言板上下文，跳到留言板或留言锚点。

评论：

- 主体显示评论正文。
- 下方显示来源上下文：`来自文章《标题》` 或 `来自碎语：摘要`。
- 点击跳到 root 页面，并尽量携带评论锚点。

回复：

回复必须比普通评论多一层上下文，避免单句回复看不懂。结构：

```text
[头像] 作者昵称 [赞过回复] 点赞时间
        @被回复人 回复正文摘要

        回复自
        父评论/父留言摘要

        来自文章《标题》 / 来自碎语：摘要 / 来自留言板
```

视觉要求：

- 回复正文是主内容。
- `parent` 用浅色引用块展示：`rounded-md bg-muted/45 px-3 py-2 border-l-2 border-border`。
- `root` 用更轻的一行链接展示，不再套一层卡片。
- 若 `parent.deleted` 或 `root.deleted` 为 true，显示 `原内容已不可访问`，不要生成可点击链接。

### 接口与数据

使用后端统一接口：

```text
GET /users/:id/likes?page=1&page_size=20&type=article|comment|guestbook|moment
```

`type` 不传表示全部；`type=comment` 包含评论与回复。

前端必须走 `@repo/api` 类型化 client，不在组件里裸 `fetch`。在 `packages/api` 增加：

- `UserLikedContentListReq`
- `UserLikedContentPageResp`
- `UserLikedContentItemResp`
- `apiClient.users.listLikedContent(userId, req)`

`apps/web` 客户端组件通过 Next route handler/proxy 调接口，业务请求下沉到 hook，例如：

- `apps/web/hooks/use-user-liked-content.ts`

### 组件拆分

建议新增：

```text
apps/web/app/users/[id]/_components/profile-likes-tab/
  constants.ts
  liked-content-format.ts
  liked-content-card.tsx
  profile-likes-tab.tsx
  profile-likes-virtual-list.tsx
```

职责：

- `profile-likes-tab.tsx`：筛选、分页、加载、空态、错误态。
- `profile-likes-virtual-list.tsx`：`react-virtuoso` 无限滚动，结构参考碎语 Tab。
- `liked-content-card.tsx`：统一渲染五类点赞项。
- `liked-content-format.ts`：标签、颜色、跳转地址、筛选参数。
- `constants.ts`：`PAGE_SIZE = 20`、筛选项配置。

### 状态

空态：

- 复用 `ProfileTabEmptyState`。
- icon 使用 `heart-fill`，玫瑰色。
- 本人：`你还没有点赞过任何内容`
- 访客：`TA 还没有点赞过任何内容`

加载：

- 首屏 skeleton 结构要接近真实卡片：头像圆、第一行、两行正文。
- 加载更多复用碎语列表的底部 loader 视觉。
- 没有更多数据时显示轻量结束态，不要大面积占位。

错误：

- 首屏失败：在 Tab 内容区显示 `加载失败，请稍后重试` 和重试按钮。
- 加载更多失败：保留已有内容，在列表尾部显示错误与重试，不清空列表。

### 测试

至少覆盖：

- `profile-likes-tab.test.tsx`：初始渲染、筛选切换、空态、首屏错误、加载更多。
- `liked-content-card.test.tsx`：文章、评论、回复、留言、碎语五类渲染；重点覆盖回复的 `parent/root`。
- `liked-content-format.test.ts`：筛选参数、Badge 文案、跳转地址。
- `user-profile-tabs.test.tsx`：点赞 Tab 不再只是空态，占位被真实 Tab 组件替换。
