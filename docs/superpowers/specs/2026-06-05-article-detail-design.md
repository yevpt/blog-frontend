# 文章详情页设计文档

**日期**：2026-06-05  
**路由**：`apps/web/app/articles/[id]/page.tsx`  
**状态**：已确认，待实现

---

## 1. 整体布局

### 骨架

```
┌─────────────────────────────────────────────┐
│                   SiteNavbar                │
├─────────────────────────────────────────────┤
│           Hero（全宽封面图 + 遮罩）            │
│      标题 / 分类 / 时间 / 阅读数 / 点赞数       │
├─────────────────────────────────────────────┤
│   ┌─────────────────────────┐  ┌──────────┐ │
│   │     正文（Markdown）     │  │ TOC 目录 │ │
│   │     max-w: 720px        │  │  sticky  │ │
│   │                         │  │  176px   │ │
│   └─────────────────────────┘  └──────────┘ │
├─────────────────────────────────────────────┤
│              评论区（内联，无弹窗）             │
├─────────────────────────────────────────────┤
│                  SiteFooter                 │
└─────────────────────────────────────────────┘
                                    ┌──────┐
                                    │  ♪   │ fixed
                                    │  ♥   │ 右下角
                                    │  ↑   │
                                    └──────┘
```

### 关键约束

- **无页面级侧边栏**：采用沉浸单列阅读，内容区两侧留白，TOC 浮于留白区
- **整体容器**：`max-w-[1120px] mx-auto px-5`（与首页一致）
- **正文区域**：文章体容器 `max-w-[1100px] mx-auto`，内部用 `xl:grid-cols-[1fr_200px]` 双列——左列内容自身用 `max-w-[720px] mx-auto`，右列 200px 放 sticky TOC；`xl:` 以下折回单列

---

## 2. 各模块规格

### 2.1 Hero（全宽封面图）

- **尺寸**：全宽（`w-full`），高度 `h-[380px] md:h-[480px]`
- **图片**：`object-cover object-center`，无封面图时显示渐变占位背景（`bg-gradient-to-br from-muted to-muted/60`）
- **遮罩**：底部向上渐变 `linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)`
- **叠加内容**（底部左对齐，与正文区同宽居中）：
  - 分类标签（badge 样式，使用 `primary` 色）
  - 文章标题（`text-2xl md:text-3xl font-extrabold text-white`）
  - 元信息行：发布时间 · 预计阅读时长（字数 ÷ 300 wpm 取整）
  - 统计行：阅读数 / 点赞数 / 评论数（仅展示，不可交互）

### 2.2 正文区（Markdown 渲染）

- **渲染方案**：后端返回原始 Markdown 字符串（`content` 字段）；Next.js Server Component 用 `remark` + `rehype-sanitize` + `rehype-stringify` 管道转为 HTML，将 `contentHtml` 作为 prop 传给客户端组件，客户端 `dangerouslySetInnerHTML` 渲染（HTML 已在服务端 sanitize，无 XSS 风险）
- **样式**：`@tailwindcss/typography`（`prose prose-neutral dark:prose-invert`），字体大小 `text-base`，行高 `leading-relaxed`
- **阅读进度条**：`h-[2px]` fixed 贴顶，颜色 `bg-primary`，宽度由 scroll 位置驱动（客户端 `useScrollProgress` hook）
- **代码块**：保留 `prose` 默认样式，可后续替换为 `shiki` 语法高亮

### 2.3 目录（TOC）

- **触发条件**：文章含 `h2` / `h3` 标题才渲染，少于 2 个标题时隐藏
- **桌面端**（`xl:` 以上）：
  - 占据 `grid-cols-[1fr_200px]` 的右列，`position: sticky; top: 88px`（Navbar 高度 + 8px）
  - 宽度 200px，独立列布局，不压缩正文宽度
  - 当前阅读章节高亮（`IntersectionObserver` 实现实时追踪）
  - 点击章节平滑滚动（`scrollIntoView({ behavior: 'smooth' })`）
- **移动端**（`xl:` 以下）：
  - 折叠为正文顶部的手风琴（`<details>` 或受控 Accordion），默认收起
  - 展开后显示完整章节列表

### 2.4 浮动操作区（fixed 右下角）

三个圆形图标，垂直排列，`bottom-6 right-6`，`z-50`：

| 图标 | 功能 | 状态说明 |
|------|------|---------|
| 音乐（♪） | 背景音乐播放器 | 文章无音乐时隐藏；有音乐时展示，点击展开迷你播放器（曲名 + 进度 + 播放/暂停） |
| 点赞（♥） | 文章点赞 | 未登录点击 → 唤起登录 Modal；已登录 → 调 `POST /api/articles/[id]/like`；已点赞态显示 filled 样式 |
| 回顶（↑） | 滚动回顶 | 滚动超过 Hero 高度后出现（`opacity` 过渡） |

### 2.5 背景音乐播放器

- **数据来源**：文章详情接口返回 `music_url?: string` 和 `music_name?: string`（需后端支持，前端做空值保护）
- **迷你播放器展开**：点击音乐图标后，在图标上方弹出卡片（`position: absolute; bottom: 100%`），显示：曲名、进度条（`<input type="range">`）、播放/暂停按钮
- **音频元素**：`<audio>` 挂载在组件内，loop 模式，组件卸载时暂停

### 2.6 阅读数模块

- 阅读数在 Hero 叠加区**展示**（SSR 数据）
- 进入页面后触发一次 `POST /api/articles/[id]/view`（客户端 `useEffect` 执行一次，不阻塞渲染）
- 不实时更新阅读数显示（SSR 快照即可）

### 2.7 评论模块

- **位置**：正文末尾，`<CommentSection>` 内联渲染，非弹窗
- **复用组件**：`apps/web/components/comments/` 下已有 `CommentSection`、`CommentItem`、`CommentInput`
- **CommentSection** 接收 `targetId` 和 `targetType="article"`，内部管理分页与加载

---

## 3. 数据获取

### 3.1 文章详情类型（待补充到 `packages/api/src/types/article.ts`）

```typescript
export interface ArticleDetailResp {
  id: number;
  title: string;
  cover_img_url?: string;
  content: string;           // Markdown 原文（服务端渲染）
  short_content?: string;
  user_id: number;
  status: number;
  comment_status: number;
  read_count: number;
  like_count: number;
  comment_count: number;
  is_liked?: boolean;        // 需登录态才有值
  is_recommended: boolean;
  music_url?: string;
  music_name?: string;
  category?: ArticleRelationResp;
  tags?: ArticleRelationResp[];
  created_at: string;
  updated_at: string;
}
```

### 3.2 API Client 新增方法（`packages/api/src/client.ts`）

```typescript
articles: {
  // 现有 listPublic...
  getDetail: (id: number) => fetchPublic<ArticleDetailResp>(`/articles/${id}`, { method: 'GET' }),
  like: (id: number) => fetchAuthed<ArticleLikeResp>(`/articles/${id}/like`, { method: 'POST' }),
  view: (id: number) => fetchPublic<void>(`/articles/${id}/view`, { method: 'POST' }),
}
```

### 3.3 页面数据流

```
page.tsx (Server Component)
  └─ createServerApiClient().articles.getDetail(id)
       ├─ 404 → notFound()
       └─ 成功 → remark/rehype 管道将 content(Markdown) 转为 contentHtml(string)
            └─ 传 article + contentHtml 给各客户端子组件
```

---

## 4. 新文件清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `apps/web/app/articles/[id]/page.tsx` | Server Component | 页面入口，SSR 数据获取 |
| `apps/web/app/articles/[id]/page.test.tsx` | 测试 | 页面渲染测试 |
| `apps/web/components/article-detail/article-hero.tsx` | Client/Server | Hero 封面区 |
| `apps/web/components/article-detail/article-content.tsx` | Client Component | Markdown HTML 渲染 + 进度条 |
| `apps/web/components/article-detail/article-toc.tsx` | Client Component | 目录（桌面 sticky / 移动折叠） |
| `apps/web/components/article-detail/article-float-actions.tsx` | Client Component | 右下角浮动操作组 |
| `apps/web/components/article-detail/music-player.tsx` | Client Component | 背景音乐迷你播放器 |
| `apps/web/components/article-detail/index.ts` | 导出 | barrel export |
| `apps/web/hooks/use-scroll-progress.ts` | Hook | 阅读进度 0~1 |
| `apps/web/hooks/use-active-heading.ts` | Hook | TOC 当前章节追踪 |
| `packages/api/src/types/article.ts` | 类型补充 | 新增 `ArticleDetailResp` |
| `packages/api/src/client.ts` | 方法补充 | 新增 `getDetail` / `like` / `view` |

---

## 5. 响应式行为

| 断点 | 正文宽度 | TOC | 浮动操作 |
|------|---------|-----|---------|
| `< xl` (< 1280px) | 全宽 `px-5`，最大 720px | 顶部折叠手风琴 | 保留，`bottom-4 right-4` |
| `xl` (≥ 1280px) | max-w-720px（1fr 列内居中） | sticky 右侧 200px 列 | 保留 |

---

## 6. 不在本期范围

- 文章编辑 / 删除（Admin 功能）
- 文章分享按钮
- 上一篇 / 下一篇导航
- 代码块语法高亮（`shiki`）—— prose 默认样式先行
- 评论的 Markdown 渲染
