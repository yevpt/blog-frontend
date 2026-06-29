# Guestbook Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development`, then follow repository skills `building-ui`、`extending-api`、`writing-tests`.

**Goal:** 让留言发布、编辑、回复和留言列表完整支持审核状态、幂等键、风险反馈及互动限制。

**Architecture:** 留言业务只修改 guestbook 自有 Hook、组件、页面和 BFF 路由。回复条目的最终渲染继续复用评论任务拥有的 `CommentReplies`；本任务负责留言回复提交、pending reply 状态以及留言回复 PATCH BFF，不进入 `components/comments/**`。

## 文件所有权

允许修改：

- `apps/web/hooks/use-guestbook*.ts` 与对应测试。
- `apps/web/components/guestbook/**`。
- `apps/web/app/guestbook/**`。
- `apps/web/app/api/guestbook/**`。

禁止修改：

- `packages/api/**`、基础幂等键、代理和公共审核组件。
- `apps/web/components/comments/**`。
- `apps/web/components/moments/**`、通知和 admin 文件。
- `apps/web/next-env.d.ts`。

## 实施要求

### 1. 留言与回复提交

- `useGuestbookSubmit` 分别使用 `useIdempotencyKey("guestbook")` 和 `useIdempotencyKey("reply")`。
- 留言指纹包含 owner user ID（存在时）和完整正文；回复指纹包含留言 ID、父回复 ID、完整正文。
- 请求发送 `Idempotency-Key`。
- 成功后重置对应键；4xx 明确结果重置；网络错误、502 和其他 5xx 保留以供原载荷重试。
- 成功 toast 优先使用 `moderation.notice`。
- 高风险拒绝只显示后端风险文案，不调用 `addItem` 或 `incrementReplyCount`。

### 2. 编辑和 BFF

- `apps/web/app/api/guestbook/[id]/route.ts` 在现有 DELETE 旁增加 PATCH，代理到 `/guestbook/:id`。
- `apps/web/app/api/guestbook/comment-replies/[id]/route.ts` 增加 PATCH，代理到 `/guestbook/comment-replies/:id`；实际回复编辑 UI 由共享回复任务消费。
- 新增留言编辑 Hook 或在现有提交 Hook 中加入明确的 `editEntry(id, content)`，使用 `guestbook-edit` 作用域。
- 编辑成功按 ID 原位替换，不改变总数、页数和回复数。
- 作者编辑器初始正文使用 `moderation.pending_content ?? content`。

### 3. 列表展示

- `GuestbookItem` 在标题/作者区域复用 `ModerationStatusBadge`。
- `public_state=placeholder` 使用 `ModerationContentPlaceholder`，不得渲染提交正文或待审正文。
- 低风险发布直接显示正文并标记“待审核”。
- 中风险编辑继续显示后端返回的最后通过正文；作者编辑时显示待审正文。
- 所有互动判断先调用 `normalizeModerationView(item.moderation)`；`can_interact=false` 时禁用点赞和回复，但作者删除、编辑入口不由前端审核状态擅自移除。
- 审核关闭或 `moderation` 缺失时保持现有留言体验。

### 4. 与共享回复组件的边界

- 本任务只把后端 `CommentReplyResp` 原样保存为 pending reply，不自行复制回复卡片。
- 不修改 `CommentReplies`、`ThreadReplyItem` 或评论 Hook。
- 若并行期间共享回复组件尚未显示审核状态，聚焦测试可以 mock 它；合并后由评论任务提供最终行为。

## TDD 验收用例

至少覆盖：

1. 留言和回复拥有不同且稳定的幂等键。
2. 正文变化后自动获得新键。
3. 低风险留言插入列表并显示“待审核”。
4. 中风险留言显示安全占位，不泄露 `pending_content`。
5. 高风险错误不插入留言、不增加回复数。
6. 编辑中风险留言公开显示旧正文，编辑器显示待审正文。
7. `can_interact=false` 禁止点赞和回复。
8. 留言和留言回复 PATCH BFF 路径正确。

## 验证命令

```bash
pnpm --filter web exec vitest run hooks/use-guestbook-submit.test.ts hooks/use-guestbook-list.test.ts components/guestbook app/guestbook app/api/guestbook
pnpm --filter web check-types
pnpm --filter web lint
pnpm exec prettier --check apps/web/hooks/use-guestbook* apps/web/components/guestbook apps/web/app/guestbook apps/web/app/api/guestbook
```

## 可直接交给 agent 的提示词

```text
你在 /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend 的 dev 分支工作。请完整执行 docs/moderation/agents/02-guestbook.md。

开始前阅读根 AGENTS.md，以及 .agents/skills/building-ui/SKILL.md、extending-api/SKILL.md、writing-tests/SKILL.md，并严格按 TDD 实现。

只修改文档授权的 guestbook 文件。不要进入 components/comments 修共享回复组件，不要修改 packages/api、基础 moderation/幂等/代理文件、moments、notifications、admin 或 apps/web/next-env.d.ts。若必须越界，停止并报告。不要提交 git commit，由主 agent 统一整合。完成后运行文档指定的测试、类型检查、lint 和格式检查，并简洁汇报结果与风险。
```
