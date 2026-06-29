# Comments And Replies Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development`, then follow repository skills `building-ui`、`extending-api`、`writing-tests`.

**Goal:** 让文章评论、碎语评论以及三类业务共用的回复列表完整支持审核状态、幂等提交、编辑再审和互动限制。

**Architecture:** 评论写请求仍通过 Next BFF；`useCommentSubmit` 负责评论/回复幂等键与提交反馈，评论列表和共享回复组件负责审核展示。留言回复也复用 `components/comments/parts/comment-replies.tsx`，因此本任务负责所有 target type 的回复审核渲染，但不修改留言业务目录和留言 BFF 路由。

## 文件所有权

允许修改：

- `apps/web/hooks/use-comment*.ts` 与对应测试。
- `apps/web/components/comments/**`。
- `apps/web/app/api/articles/**/comments/**`、`apps/web/app/api/articles/comment-replies/**`。
- `apps/web/app/api/moments/**/comments/**`、`apps/web/app/api/moments/comment-replies/**`。

禁止修改：

- `packages/api/**`。
- `apps/web/lib/backend-proxy.ts`、`apps/web/hooks/use-idempotency-key.ts`。
- `apps/web/components/moderation/**`。
- `apps/web/components/guestbook/**`、`apps/web/components/moments/**`、通知和 admin 文件。
- `apps/web/next-env.d.ts`。

## 已有接口

```ts
const { getIdempotencyKey, resetIdempotencyKey } = useIdempotencyKey("comment");
const key = getIdempotencyKey(JSON.stringify({ targetType, targetId, content }));
```

请求头：

```ts
headers: {
  "Content-Type": "application/json",
  "Idempotency-Key": key,
}
```

公共展示：

```ts
const moderation = normalizeModerationView(item.moderation);
<ModerationStatusBadge moderation={item.moderation} />
<ModerationContentPlaceholder moderation={item.moderation} />
```

## 实施要求

### 1. 提交与幂等

- `useCommentSubmit` 为评论和回复分别创建 `useIdempotencyKey("comment")`、`useIdempotencyKey("reply")`，不能共用一个当前键。
- 指纹必须包含 target type、目标 ID、父回复 ID 和完整正文。
- 相同载荷的 5xx、502、网络异常重试保留键。
- 成功、401、403、400 高风险或其他明确业务拒绝后重置键。
- 成功 toast 优先使用 `response.moderation?.notice`；没有 notice 时沿用当前文案。
- 高风险失败只展示后端错误，不调用 `addComment`、不增加回复数、不保留本地乐观项。

### 2. BFF 编辑路由

- 评论 ID 路由在现有 `DELETE` 旁增加 `PATCH`，调用 `proxyPatch`：
  - `/articles/comments/:id`
  - `/moments/comments/:id`
- 回复 ID 路由增加 `PATCH`：
  - `/articles/comment-replies/:id`
  - `/moments/comment-replies/:id`
- 不修改留言回复路由；留言任务负责 `/guestbook/comment-replies/:id`。
- 路由测试必须断言 path、method 和 `Idempotency-Key` 由公共代理透传。

### 3. 审核展示

- `public_state=placeholder` 时使用 `ModerationContentPlaceholder`，不得把 `content` 或 `pending_content` 传给 Markdown 渲染器。
- `visible + has_pending_revision` 在评论/回复头部显示 `ModerationStatusBadge`。
- 中风险编辑时卡片继续展示响应中的旧 `content`；只有作者打开编辑器时使用 `moderation.pending_content ?? content`。
- 低风险编辑后直接展示响应中的新 `content`，同时保留待审核 Badge。
- `normalizeModerationView(...).can_interact=false` 时隐藏或禁用点赞、回复按钮；删除和作者编辑仍按后端权限保留。

### 4. 编辑交互

- 在现有作者操作入口增加编辑，不新造第二套评论卡片。
- 评论编辑请求 body 为 `{ content }`；回复编辑请求保留 `parent_reply_id` 和 `content`。
- 编辑成功后按 ID 原位替换列表项，不改变评论/回复计数。
- 编辑器必须显示“内容正在审核”状态；若存在 `pending_content`，编辑的是待审版本而非公开旧版本。

## TDD 验收用例

至少覆盖：

1. 评论和回复请求携带稳定 `Idempotency-Key`，同载荷重试相同、正文变化不同。
2. 低风险响应插入列表并显示“待审核”。
3. 中风险首次评论只显示安全占位。
4. 中风险编辑展示旧正文，编辑器展示 `pending_content`。
5. 高风险错误不插入列表且显示后端风险文案。
6. `can_interact=false` 时点赞和回复不可操作。
7. 文章、碎语、留言三种回复的审核展示都由共享回复组件覆盖。
8. PATCH BFF 路由转发到准确后端路径。

## 验证命令

```bash
pnpm --filter web exec vitest run hooks/use-comment-submit.test.ts hooks/use-comment-list.test.ts components/comments
pnpm --filter web check-types
pnpm --filter web lint
pnpm exec prettier --check apps/web/hooks/use-comment* apps/web/components/comments apps/web/app/api/articles apps/web/app/api/moments
```

## 可直接交给 agent 的提示词

```text
你在 /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend 的 dev 分支工作。请完整执行 docs/moderation/agents/01-comments-and-replies.md。

开始前阅读根 AGENTS.md，以及 .agents/skills/building-ui/SKILL.md、extending-api/SKILL.md、writing-tests/SKILL.md，并严格使用 TDD：先写失败测试、确认失败原因，再写实现。

严格遵守文档中的文件所有权。不要修改 packages/api、公共 moderation 组件、guestbook、moments 主业务、notifications、admin 或 apps/web/next-env.d.ts；若确实需要越界，停止并报告，不要自行修改。不要提交 git commit，由主 agent 统一整合。完成后运行文档中的聚焦测试、类型检查、lint 和格式检查，只汇报改动、验证结果与剩余风险。
```
