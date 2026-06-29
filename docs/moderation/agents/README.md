# 内容审核前端并行实施说明

## 执行前提

以下基础能力已由主任务提供，业务 agent 只能消费，禁止重复实现：

- `packages/api/src/types/moderation.ts`：审核状态、管理接口请求响应类型。
- `packages/api/src/client.ts`：`apiClient.moderation` 和带可选幂等键的 UGC 方法。
- `apps/web/lib/backend-proxy.ts`：JSON、PATCH、multipart 写请求透传 `Idempotency-Key`。
- `apps/web/lib/idempotency-key.ts`：幂等键生成。
- `apps/web/hooks/use-idempotency-key.ts`：相同载荷指纹复用键，载荷变化自动换键。
- `apps/web/components/moderation/`：`ModerationStatusBadge`、`ModerationContentPlaceholder`、`normalizeModerationView`。

生产审核暂时保持 `moderation.enabled: false`。前端必须兼容 `moderation` 缺失或零值；读取 `can_interact` 前先调用 `normalizeModerationView`。

## 并行批次

以下五项可以同时执行，文件所有权互不重叠：

| 文档                                                               | 独占范围                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [01-comments-and-replies.md](./01-comments-and-replies.md)         | `apps/web/components/comments/**`、`apps/web/hooks/use-comment*`、文章/碎语评论 BFF 路由                  |
| [02-guestbook.md](./02-guestbook.md)                               | `apps/web/components/guestbook/**`、`apps/web/hooks/use-guestbook*`、留言 BFF 路由                        |
| [03-moments.md](./03-moments.md)                                   | `apps/web/components/moments/**`、`apps/web/hooks/use-moment*`、碎语 modal store、`/api/moments/route.ts` |
| [04-admin-moderation.md](./04-admin-moderation.md)                 | 新建 `apps/admin/src/modules/moderation/**`，并注册 `apps/admin/src/config/modules.ts`                    |
| [05-moderation-notifications.md](./05-moderation-notifications.md) | `apps/web/components/notifications/**`、通知页面与通知 store                                              |

并行期间禁止运行自动格式化全仓的命令；只格式化自己拥有的文件。任何任务发现必须修改基础文件或其他任务独占文件时，应停止并报告主 agent，不得越界修改。

五项并行任务合入后，再单独执行 [06-integration.md](./06-integration.md)；集成任务不得与前五项并行。

## 统一审核语义

- 低风险首次发布或编辑：响应正文可展示，显示“待审核”。
- 中风险首次发布：`public_state=placeholder`，不得显示 `pending_content`。
- 中风险编辑：公开正文来自 `last_approved`，作者编辑器可使用 `pending_content`。
- 高风险：请求失败并显示后端“内容存在风险”文案，不插入乐观数据。
- `can_interact=false`：禁用点赞、回复等互动入口。
- `notice`：成功响应优先使用后端文案。
- 同一载荷的网络重试复用幂等键；载荷指纹变化自动生成新键；成功或明确的 4xx 业务结果后调用 `resetIdempotencyKey()`。
- 未审核图片只能使用后端返回的 `access_url`，前端不得拼接原图地址。

## 合并后验证

五项并行任务完成后由主 agent 统一运行：

```bash
pnpm test:run
pnpm check-types
pnpm lint
pnpm build
pnpm format:check
git diff --check
```
