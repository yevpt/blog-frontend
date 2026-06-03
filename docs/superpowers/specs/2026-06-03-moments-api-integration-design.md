# 碎语 API 对接设计文档

**日期：** 2026-06-03  
**范围：** 首页侧边栏碎语区域（公开列表读取）

---

## 目标

将首页侧边栏的碎语区从静态 mock 数据切换为后端真实 API（`GET /moments`），保持现有 UI 不变。

## 不在范围内

- 点赞交互对接（需要认证）
- 碎语详情页
- 发表碎语功能
- 管理端碎语 CRUD

---

## 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/moments` | 分页查询公开碎语，支持 `page`、`page_size` 过滤 |

**首页调用参数：** `page=1&page_size=3`（侧边栏最多显示 3 条）

**响应类型 `MomentPageResp`：**
```
total, pages, page, page_size, list: MomentItemResp[]
```

**`MomentItemResp` 关键字段：**
- `id: number`
- `content: string`
- `like_count: number`（Go int64）
- `comment_count: number`（Go int64）
- `read_count: number`
- `is_liked: boolean`
- `is_top: boolean`
- `status: 0|1`、`comment_status: 0|1`
- `created_at: string`（ISO 日期时间）
- `user?: MomentUserResp`
- `images: MomentMediaResp[]`

**`MomentUserResp` 字段：**
- `id: number`、`username: string`
- `nickname?: string`、`avatar_url?: string`、`site?: string`、`mark?: string`

---

## 变更清单

### 1. `packages/api/src/types/moment.ts`（新建）
对应后端 DTO 的 TypeScript 接口：
- `MomentListReq`（可选 `user_id`、`role_id`、`page`、`page_size`）
- `MomentUserResp`
- `MomentMediaResp`（含 `access_url`）
- `MomentItemResp`
- `MomentPageResp`

### 2. `packages/api/src/client.ts`
在 `createApiClient` 返回值中增加：
```ts
moments: {
  listPublic: (req?: MomentListReq) => fetchPublic<MomentPageResp>('/moments?...')
}
```
调用 `fetchPublic`（公开端点，无需 token）。

### 3. `packages/api/src/index.ts`
导出 `MomentListReq`、`MomentItemResp`、`MomentUserResp`、`MomentMediaResp`、`MomentPageResp`。

### 4. `apps/web/app/page.tsx`
- 移除 `import { snippets }` mock 导入
- 在 `Promise.all` 中并发调用 `api.moments.listPublic({ page: 1, page_size: 3 })`
- 请求失败时降级为空数组 `[]`
- 将 `MomentItemResp[]` 传给 `<SnippetsSection>`

### 5. `apps/web/components/snippets/snippets-section.tsx`
- `SnippetsSectionProps.snippets` 类型从 `Snippet[]` 改为 `MomentItemResp[]`

### 6. `apps/web/components/snippets/snippet-card.tsx`
- props 类型从 `Snippet` 改为 `MomentItemResp`
- 字段映射：
  - 作者名：`moment.user?.nickname ?? moment.user?.username ?? "匿名"`
  - 头像：`moment.user?.avatar_url ?? ""`
  - 身份标签：`moment.user?.mark ?? ""`
  - 时间：`new Date(moment.created_at)`（传给 `formatRelativeTime`）
  - 点赞数：`moment.like_count`
  - 评论数：`moment.comment_count`

### 7. `apps/web/components/snippets/snippets-section.test.tsx`
- 改用 `MomentItemResp` 构造测试数据（去掉 `Snippet` 类型导入）
- 更新 `makeSnippet` 辅助函数签名及字段

### 8. `apps/web/app/home-content.tsx`（删除）
确认未被引用，删除废弃文件。

---

## 数据降级策略

定义空值常量，与 articles 的处理方式保持一致：
```ts
const EMPTY_MOMENTS: MomentPageResp = { total: 0, pages: 0, page: 1, page_size: 3, list: [] };
```
`api.moments.listPublic({ page: 1, page_size: 3 }).catch(() => EMPTY_MOMENTS)`，确保 API 异常时首页仍能正常渲染。

---

## 测试策略

- `packages/api` 层无需新增测试（`fetchPublic` 已有覆盖）
- `snippets-section.test.tsx` 改用 `MomentItemResp` 类型，保持原有测试用例逻辑不变
- `apps/web/app/page.test.tsx` 不需要改动（测试内容不涉及碎语 props 细节）
