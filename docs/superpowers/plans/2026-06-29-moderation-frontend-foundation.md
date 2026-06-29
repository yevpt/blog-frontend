# Moderation Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为评论、留言、碎语和管理后台提供统一的审核类型、接口、幂等请求基础设施与公共展示组件。

**Architecture:** `@repo/api` 是后端契约唯一事实源；web 客户端写请求仍经 Next BFF，但 BFF 必须原样转发 `Idempotency-Key`。幂等键由通用 Hook 在一次逻辑提交的重试期间保持稳定，业务成功或业务拒绝后由消费方重置。公共组件只解释审核状态，不包含评论、留言或碎语业务逻辑。

**Tech Stack:** React 19、TypeScript 6、Next.js 16、Vitest 4、TailwindCSS、`@repo/api`、`@repo/ui`。

## Global Constraints

- 禁止修改用户已有的 `apps/web/next-env.d.ts`。
- 禁止 `any`，接口字段与 Go DTO 保持 snake_case。
- `Idempotency-Key` 同一次网络重试必须复用；新内容或修改内容后再次提交必须生成新键。
- 图片显示模式只允许 `original`、`blurred`、`gif_placeholder`。
- 举报、申诉、图片语义识别和审核规则 CRUD 不在本次范围。

---

### Task 1: 审核 API 契约

**Files:**

- Create: `packages/api/src/types/moderation.ts`
- Modify: `packages/api/src/types/comment.ts`
- Modify: `packages/api/src/types/guestbook.ts`
- Modify: `packages/api/src/types/moment.ts`
- Modify: `packages/api/src/index.ts`
- Modify: `packages/api/src/client.ts`
- Test: `packages/api/src/client.test.ts`

**Interfaces:**

- Produces: `ModerationView`、审核枚举、全部 `/admin/moderation/**` 请求响应类型与 `apiClient.moderation` 方法。
- Produces: 所有 UGC 发布、编辑、回复方法接收 `idempotencyKey?: string`；可选仅用于审核关闭的分阶段上线，业务适配完成后必须传值。

- [x] **Step 1: 写失败测试**

在 `client.test.ts` 断言评论发布携带 `Idempotency-Key`，并断言审核列表、修正、控制更新、用户处罚和紧急隐藏方法使用准确的 URL、HTTP method、query/body。

- [x] **Step 2: 验证测试失败**

Run: `pnpm --filter @repo/api test`

Expected: FAIL，原因是 UGC 方法尚不接收幂等键且 `client.moderation` 不存在。

- [x] **Step 3: 实现精确类型和 client 方法**

新增联合类型：

```ts
export type ModerationRiskLevel = "low" | "medium" | "high";
export type ModerationPublicState = "visible" | "placeholder" | "hidden" | "emergency_hidden";
export type ModerationDisplayVersion = "pending" | "last_approved" | "none";
export type ModerationReviewStatus = "pending" | "approved" | "rejected" | "superseded";
export type ModerationImageDisplayMode = "original" | "blurred" | "gif_placeholder";
```

所有需要审核的写方法通过以下 header 发送调用方提供的键：

```ts
headers: { "Idempotency-Key": idempotencyKey }
```

管理端方法统一使用 `fetchAuthed`，列表只拼接已定义的 query 参数。

- [x] **Step 4: 验证 API 包**

Run: `pnpm --filter @repo/api test && pnpm --filter @repo/api check-types && pnpm --filter @repo/api lint`

Expected: 全部退出码为 0。

### Task 2: 幂等键生命周期

**Files:**

- Create: `apps/web/lib/idempotency-key.ts`
- Create: `apps/web/lib/idempotency-key.test.ts`
- Create: `apps/web/hooks/use-idempotency-key.ts`
- Create: `apps/web/hooks/use-idempotency-key.test.ts`

**Interfaces:**

- Produces: `createIdempotencyKey(scope)`。
- Produces: `useIdempotencyKey(scope)` 返回 `getIdempotencyKey(fingerprint)` 和 `resetIdempotencyKey()`。

- [x] **Step 1: 写失败测试**

断言键包含作用域且不超过 128 字符；Hook 相同载荷指纹返回同一键，指纹变化或调用 reset 后返回新键。

- [x] **Step 2: 验证测试失败**

Run: `pnpm --filter web test -- lib/idempotency-key.test.ts hooks/use-idempotency-key.test.ts`

Expected: FAIL，原因是模块尚不存在。

- [x] **Step 3: 实现生成器与 Hook**

```ts
export function createIdempotencyKey(scope: IdempotencyScope): string {
  return `${scope}:${crypto.randomUUID()}`;
}
```

Hook 使用 `useRef` 保存 scope、fingerprint 和当前键；`getIdempotencyKey` 仅在 scope 或 fingerprint 变化时生成，`resetIdempotencyKey` 清空引用。

- [x] **Step 4: 验证相关测试**

Run: `pnpm --filter web test -- lib/idempotency-key.test.ts hooks/use-idempotency-key.test.ts`

Expected: PASS。

### Task 3: BFF 幂等请求头透传

**Files:**

- Modify: `apps/web/lib/backend-proxy.ts`
- Test: `apps/web/lib/backend-proxy.test.ts`

**Interfaces:**

- Consumes: 浏览器请求头 `Idempotency-Key`。
- Produces: `proxyPost`、`proxyPatch`、`proxyPostForm` 向 Go 后端透传同一值。

- [x] **Step 1: 写失败测试**

分别构造 JSON、PATCH、multipart 请求，断言后端 fetch 收到相同的 `Idempotency-Key`；请求没有该头时不得生成或转发空头。

- [x] **Step 2: 验证测试失败**

Run: `pnpm --filter web test -- lib/backend-proxy.test.ts`

Expected: FAIL，后端 fetch headers 中没有 `Idempotency-Key`。

- [x] **Step 3: 实现安全透传**

新增只读取请求头的辅助函数：

```ts
function idempotencyHeader(req: NextRequest): Record<string, string> {
  const key = req.headers.get("Idempotency-Key")?.trim();
  return key ? { "Idempotency-Key": key } : {};
}
```

只在三个写代理的后端 headers 中展开，不影响 GET、DELETE、认证刷新和 Cookie 转发。

- [x] **Step 4: 验证代理测试**

Run: `pnpm --filter web test -- lib/backend-proxy.test.ts`

Expected: PASS。

### Task 4: 公共审核状态组件

**Files:**

- Create: `apps/web/components/moderation/moderation-presentation.ts`
- Create: `apps/web/components/moderation/moderation-status-badge.tsx`
- Create: `apps/web/components/moderation/moderation-content-placeholder.tsx`
- Create: `apps/web/components/moderation/index.ts`
- Create: `apps/web/components/moderation/moderation-status-badge.test.tsx`
- Create: `apps/web/components/moderation/moderation-content-placeholder.test.tsx`

**Interfaces:**

- Consumes: `ModerationView`。
- Produces: `ModerationStatusBadge`、`ModerationContentPlaceholder` 和审核关闭兼容用的 `normalizeModerationView`。

- [x] **Step 1: 写失败测试**

断言低风险待审显示“待审核”，中风险/placeholder 显示“等待人工审核”，正常已通过内容不渲染 Badge；占位组件使用 `role="status"` 且不渲染待审正文。

- [x] **Step 2: 验证测试失败**

Run: `pnpm --filter web test -- components/moderation`

Expected: FAIL，原因是组件尚不存在。

- [x] **Step 3: 实现公共展示**

`moderation-presentation.ts` 以纯函数映射 label、description 和 `Badge` variant；组件复用 `@repo/ui` 的 `Badge` 与 `cn`，不得加入领域特有按钮或请求逻辑。

- [x] **Step 4: 验证组件测试**

Run: `pnpm --filter web test -- components/moderation`

Expected: PASS。

### Task 5: 全量验证

**Files:**

- Verify only: 全仓。

- [x] **Step 1: 运行质量门禁**

Run: `pnpm test:run && pnpm check-types && pnpm lint && pnpm build`，并对本次变更文件运行 `prettier --check` 与 `git diff --check`。

Expected: 全部退出码为 0，且本次文件格式检查与 `git diff --check` 通过。仓库全量 `format:check` 当前被 225 个既有文件阻断，不纳入本任务改动。
