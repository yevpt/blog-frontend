# 友邻页面设计文档

**日期**：2026-06-13  
**路由**：`/friend-links`

---

## 概述

博客「友邻」页面，包含两部分：申请友链的规则说明卡片（可折叠），以及所有公开友情链接的响应式卡片列表。

---

## 后端变更

### `status` 枚举扩充

现有 `status` 字段只有 `0=隐藏 / 1=显示`，需新增 `2=失联`：

| 值 | 含义 |
|----|------|
| 0 | 隐藏（不在公开列表出现） |
| 1 | 显示（正常） |
| 2 | 失联（出现在列表，带「失联」标识，禁止点击） |

#### 1. GORM model — `internal/model/friend_link.go`

将 `Status` 字段的 `comment` tag 更新为包含 `2=失联` 的描述：

```go
Status uint8 `gorm:"type:tinyint;default:1;comment:状态 0=隐藏 1=显示 2=失联" json:"status"`
```

`AutoMigrate` 重跑后，MySQL `friend_link.status` 列注释会自动同步。迁移脚本（`cmd/migrate/main.go`）的 `autoMigrate()` 已注册 `&model.FriendLink{}`，无需额外修改。

#### 2. DTO 注释 — `internal/dto/friendlink.go`

`FriendLinkCreateReq`、`FriendLinkUpdateReq`、`FriendLinkItemResp` 中 `Status` 字段的 Go 注释补充 `2=失联` 说明。

#### 3. Service 校验 — `internal/service/friendlink.go`

`ErrFriendLinkStatusInvalid` 的校验条件从 `status > 1` 改为 `status > 2`，允许 `status=2` 通过验证。

---

## 前端结构

### 路由文件

`apps/web/app/friend-links/page.tsx` — Server Component

- 导出 `metadata`（标题、description）
- 调用 `api.friendLinks.listPublic({ page: 1, page_size: 50 })` 一次全量加载（友链通常 < 50 条）
- 失败时降级为空列表，不抛错
- 渲染 `<FriendLinksPage links={list} />`

### 新增 API 类型

`packages/api/src/types/friend-link.ts`

```ts
export interface FriendLinkItemResp {
  id: number;
  name: string;
  description?: string;
  site: string;
  avatar_url?: string;
  seq: number;
  status: 0 | 1 | 2;  // 2 = 失联
  created_at: string;
  updated_at: string;
}

export interface FriendLinkPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: FriendLinkItemResp[];
}

export interface FriendLinkListReq {
  page?: number;
  page_size?: number;
}
```

`packages/api/src/client.ts` 新增 `friendLinks.listPublic(req)` 方法。

### 页面组件

`apps/web/components/friend-links/friend-links-page.tsx`

纯展示组件（无需 `'use client'`），接收 `links: FriendLinkItemResp[]`，渲染：

1. 顶部标题区（`PageSectionHeader` 或内联，参照碎语页）
2. `<FriendLinksRulesCard />` 折叠卡片
3. `<FriendLinksList links={links} />`

#### 顶部标题区

参照碎语页（`snippet-filter-bar.tsx`）的样式：

```tsx
<p className="mb-1.5 text-[11px] font-bold tracking-[0.1em] text-primary">
  友情链接
</p>
<h1 className="mb-5 text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
  一些有趣的友邻
</h1>
<div className="border-b border-border mb-8" />
```

### 申请规则卡片

`apps/web/components/friend-links/friend-links-rules-card.tsx` — `'use client'`

- 默认展开，点击「收起/展开」切换 `open` 状态
- 展开内容：引导语 + 代码块格式的申请模板 + 两条注意事项 + 日期
- 申请模板用 `border-l-2 border-primary` 左边框块，等宽字体渲染

### 友链卡片列表

`apps/web/components/friend-links/friend-links-list.tsx`

响应式网格：

```
grid grid-cols-1 sm:grid-cols-2 gap-2.5
```

每张卡片：`FriendLinkCard`

- 头像：`44×44px`，`rounded-[10px]`（圆角矩形），使用 `LoadingImage` 组件；无头像时显示名称首字母占位
- 名称：`font-semibold text-sm`，单行截断
- 简介：`text-xs text-muted-foreground`，单行截断
- 右侧跳转箭头图标（`SvgIcon`）
- `status === 2`（失联）：整体 `opacity-55`，不可点击，名称旁展示红色「失联」badge，无箭头

**hover 效果**：border 颜色过渡到 `border-primary`

### 入场动效（公共组件）

`packages/ui/src/fade-in-up.tsx` — 新增共享动效组件

```tsx
interface FadeInUpProps {
  children: ReactNode;
  delay?: number;      // ms，默认 0
  duration?: number;   // ms，默认 400
  className?: string;
}
```

内部通过 inline `style` 注入 `animationDelay`，配合 Tailwind 全局 keyframe：

```css
/* tailwind.config 的 theme.extend.keyframes */
'fade-in-up': {
  from: { opacity: '0', transform: 'translateY(14px)' },
  to:   { opacity: '1', transform: 'translateY(0)' },
}
/* theme.extend.animation */
'fade-in-up': 'fade-in-up 0.4s ease both',
```

卡片列表中每张卡片按 index 依次增加 50ms delay（最多 10 张后固定，避免等待过长）。规则卡片整体作为首个入场元素（delay=0）。

`packages/ui/src/index.ts` 导出 `FadeInUp`。

---

## 数据流

```
page.tsx (Server)
  └─ api.friendLinks.listPublic()
       └─ FriendLinksPage (Server)
            ├─ 顶部标题（inline JSX）
            ├─ FriendLinksRulesCard (Client, 仅折叠交互)
            └─ FriendLinksList (Server)
                 └─ FriendLinkCard × N（含 FadeInUp 包裹）
```

---

## 错误处理 & 边界情况

- API 失败 → 降级空列表，页面正常渲染（无骨架屏，无报错）
- `avatar_url` 为空或加载失败 → `LoadingImage` 降级为首字母占位方块
- `description` 为空 → 不渲染简介行，卡片高度自适应
- 全部为失联 → 正常展示，只是所有卡片都不可点击

---

## 测试要求

| 文件 | 测试内容 |
|------|----------|
| `friend-links-rules-card.test.tsx` | ① 默认展开渲染内容 ② 点击收起后内容隐藏 |
| `friend-link-card.test.tsx` | ① 正常卡片渲染 name/description ② status=2 显示失联 badge、不可点击 ③ 无 avatar 降级首字母 |
| `friend-links-list.test.tsx` | ① 渲染所有卡片 ② 空列表不崩溃 |
| `app/friend-links/page.test.tsx` | ① 核心内容渲染 ② loading 降级（mock API 失败） |
| `fade-in-up.test.tsx`（packages/ui） | ① 渲染 children ② delay prop 注入到 style |

---

## 文件清单

**新增**
- `apps/web/app/friend-links/page.tsx`
- `apps/web/app/friend-links/page.test.tsx`
- `apps/web/components/friend-links/index.ts`
- `apps/web/components/friend-links/friend-links-page.tsx`
- `apps/web/components/friend-links/friend-links-rules-card.tsx`
- `apps/web/components/friend-links/friend-links-rules-card.test.tsx`
- `apps/web/components/friend-links/friend-links-list.tsx`
- `apps/web/components/friend-links/friend-links-list.test.tsx`
- `apps/web/components/friend-links/friend-link-card.tsx`
- `apps/web/components/friend-links/friend-link-card.test.tsx`
- `packages/api/src/types/friend-link.ts`
- `packages/ui/src/fade-in-up.tsx`
- `packages/ui/src/fade-in-up.test.tsx`

**修改**
- `packages/api/src/client.ts` — 新增 `friendLinks.listPublic`
- `packages/api/src/index.ts` — 导出新类型
- `packages/ui/src/index.ts` — 导出 `FadeInUp`
- `apps/web/tailwind.config.ts` — 新增 `fade-in-up` keyframe & animation
- `blog-backend/internal/model/friend_link.go` — `Status` comment tag 补充 `2=失联`
- `blog-backend/internal/dto/friendlink.go` — `Status` Go 注释补充 `2=失联`
- `blog-backend/internal/service/friendlink.go` — 状态校验上限从 `>1` 改为 `>2`
