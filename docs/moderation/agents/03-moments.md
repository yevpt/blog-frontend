# Moments Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development`, then follow repository skills `building-ui`、`extending-api`、`writing-tests`.

**Goal:** 让碎语发布、编辑、列表、图片和互动完整消费审核状态及图片 `display_mode`。

**Architecture:** 发布由 `MomentModal` 通过 `apiForm` 提交 multipart，列表编辑由 `useMomentList` 统一更新。图片始终使用后端 `access_url`；`display_mode` 只控制前端是否允许原图查看及审核提示，不用于推导对象地址。

## 文件所有权

允许修改：

- `apps/web/hooks/use-moment*.ts` 与对应测试。
- `apps/web/components/moments/**`。
- `apps/web/store/use-moment-modal.ts` 与测试。
- `apps/web/app/moments/**`。
- `apps/web/app/api/moments/route.ts` 与测试。
- 仅在确有页面组合需要时修改 `apps/web/components/moments/index.ts`。

禁止修改：

- `packages/api/**`、公共代理、幂等 Hook 和公共审核组件。
- `/api/moments/**/comments/**`、评论组件和评论 Hook。
- guestbook、notifications、admin、`apps/web/next-env.d.ts`。

## 实施要求

### 1. 发布与编辑幂等

- `MomentModal` 使用 `useIdempotencyKey("moment")` 发布；`useMomentList.updateMoment` 使用 `moment-edit`。
- multipart 请求通过 `apiForm`，不继续保留组件内裸 `fetch`。
- 指纹包含碎语 ID、新正文、status、comment_status，以及按顺序排列的图片身份：远端图使用 URL，文件使用 `name:size:lastModified`。
- 请求 header 传 `Idempotency-Key`；不要手动设置 multipart `Content-Type`。
- 成功或明确 4xx 后 reset；网络错误和 5xx 保留同载荷键。
- 成功 toast 优先使用 `response.moderation?.notice`。
- 高风险错误显示后端风险文案，不关闭编辑器、不刷新列表、不增加 publishCount。

### 2. 文本和版本展示

- 低风险响应：列表立即展示新正文，旁边显示“待审核”。
- 中风险首次发布：使用 `ModerationContentPlaceholder`，不得渲染正文。
- 中风险编辑：列表显示后端响应的最后通过正文；重新打开编辑器使用 `moderation.pending_content ?? content`，并明确显示“编辑内容正在审核”。
- `moderation` 缺失或零值必须经 `normalizeModerationView` 回退，不得在生产审核关闭期间禁用全部互动。

### 3. 图片 display_mode

- `original`：使用 `access_url` 正常展示，可以进入现有图片查看器。
- `blurred`：使用后端返回的模糊 `access_url`，显示待审核语义，不允许打开原图查看器。
- `gif_placeholder`：按静态审核占位图展示，不播放、不尝试加载原 GIF、不允许查看原图。
- 禁止根据 URL 文件名、MD5 名称或路径前缀猜测审核状态。
- 编辑提交继续按当前 `image_order` 语义提交图片，不能因为部分图片待审而丢弃已通过图片。

### 4. 互动限制

- `normalizeModerationView(moment.moderation).can_interact=false` 时禁用点赞、评论入口。
- 置顶、编辑和删除按原业务权限处理；前端不通过审核状态擅自恢复已删除或紧急隐藏内容。

### 5. 已知后端边界

当前列表 DTO 只返回公开 `images`，没有单独的 `pending_images`。提交响应能返回本次安全图片投影，但页面刷新后，中风险编辑版本的新图片无法从 API 单独恢复。不得从对象 key 猜原图或私自缓存授权 URL；实现时把这一点保留为集成风险，当前编辑器在刷新后只能展示公开版本图片，直到后端增加作者可见的 pending image 投影。

## TDD 验收用例

至少覆盖：

1. multipart 发布和编辑携带稳定幂等键，图片顺序或正文变化后换键。
2. 低风险编辑立即显示新正文和待审核 Badge。
3. 中风险编辑显示旧正文，编辑器读取 `pending_content`。
4. 高风险错误保留编辑器内容且不触发发布计数。
5. 三种 `display_mode` 分支都只使用 `access_url`。
6. blurred/GIF 占位图不能进入图片查看器。
7. `can_interact=false` 时点赞和评论入口不可操作。
8. `/api/moments` multipart BFF 原样转发幂等键。

## 验证命令

```bash
pnpm --filter web exec vitest run hooks/use-moment-list.test.ts components/moments store/use-moment-modal.test.ts app/moments app/api/moments/route.test.ts
pnpm --filter web check-types
pnpm --filter web lint
pnpm exec prettier --check apps/web/hooks/use-moment* apps/web/components/moments apps/web/store/use-moment-modal* apps/web/app/moments apps/web/app/api/moments/route*
```

## 可直接交给 agent 的提示词

```text
你在 /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend 的 dev 分支工作。请完整执行 docs/moderation/agents/03-moments.md。

开始前阅读根 AGENTS.md，以及 .agents/skills/building-ui/SKILL.md、extending-api/SKILL.md、writing-tests/SKILL.md，并严格按 TDD 执行。

严格限制在文档授权的 moments 文件中。不要修改 packages/api、公共 moderation/幂等/代理文件、评论子路由、guestbook、notifications、admin 或 apps/web/next-env.d.ts。特别注意文档记录的 pending_images 后端边界：不要猜原图或越权绕过。若需要越界，停止并报告。不要提交 git commit，由主 agent 统一整合。完成后运行文档验收命令，只汇报改动、验证结果和已知风险。
```
