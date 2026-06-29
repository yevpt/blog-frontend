# Moderation Frontend Integration Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:systematic-debugging` for failures and `superpowers:verification-before-completion` before reporting completion.

**Goal:** 在五个并行任务合入后验证审核前端契约、跨模块行为和生产启用前门禁，不扩展新功能。

**Architecture:** 本任务是串行收口，不与前五项并行。优先运行自动化验证和静态契约扫描；发现领域缺陷时按文件所有权定位原任务，仅做最小集成修复，不借机重构。

## 执行条件

- 01 至 05 任务已全部完成并出现在同一工作区。
- 后端生产配置仍保持 `moderation.enabled: false`。
- 用户已有的 `apps/web/next-env.d.ts` 改动必须保留。

## 验收清单

### 1. 请求契约

- 所有评论、留言、回复、碎语发布和编辑请求都发送非空 `Idempotency-Key`。
- “回复”包括评论区、留言板和消息中心内联回复，不能只扫描业务详情页 Hook。
- multipart 请求不手动写 `Content-Type`。
- BFF PATCH 路由覆盖评论、回复、留言编辑。
- 高风险错误直接使用后端文案，不暴露规则或内部评分。

### 2. 状态展示

- 低风险显示正文和待审核标识。
- 中风险首次发布显示占位，中风险编辑显示最后通过正文。
- 作者编辑器读取 `pending_content`。
- `moderation` 缺失时按审核关闭兼容，互动保持可用。
- `can_interact=false` 在评论、留言、碎语三处一致禁用互动。

### 3. 图片

- 三种 `display_mode` 都使用 `access_url`。
- blurred 和 gif_placeholder 不进入原图查看器。
- 不存在根据 MD5 文件名、路径或扩展名推断审核状态的代码。
- 记录并保留“刷新后缺少 pending_images”后端边界，不使用前端绕过。

### 4. 管理端和通知

- 管理员审核操作携带 revision_id、lock_version。
- 字符串冲突码触发刷新，不重放旧动作。
- deleted 内容无审核/恢复入口。
- 修正通知展示理由，且不提供申诉/举报/恢复原文。
- 修正/驳回理由不使用摘要截断；已审核 revision 不再显示通过/驳回/修正入口；用户批处理继续动作保持 hide/restore 方向。

## 验证命令

```bash
pnpm test:run
pnpm check-types
pnpm lint
pnpm build
pnpm format:check
git diff --check
rg -n 'Idempotency-Key' apps/web apps/admin packages/api
rg -n 'display_mode|normalizeModerationView' apps/web
rg -n 'md5|moderation/previews|gif-review' apps/web --glob '*.{ts,tsx}'
```

最后一个 `rg` 允许测试夹具或后端返回 URL 示例，但生产代码不得用这些字符串判断审核状态。

## 手工冒烟矩阵

在测试环境启用审核后逐项执行：

1. 评论、留言、回复、碎语分别发布低风险内容。
2. 分别发布中风险内容，检查占位和正文隐藏。
3. 编辑已通过内容为低风险和中风险。
4. 提交高风险内容，检查错误和列表无乐观脏数据。
5. 上传普通图、GIF、已通过图片和混合图片。
6. 管理端通过、驳回、修正并检查通知。
7. 删除、紧急隐藏、恢复、禁言和全站发布控制。

## 可直接交给 agent 的提示词

```text
你在 /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend 的 dev 分支工作。前五个审核前端任务已经合入。请完整执行 docs/moderation/agents/06-integration.md，先验证再判断，不要预设结果。

开始前阅读根 AGENTS.md。遇到失败必须使用 systematic-debugging：读取完整错误、稳定复现、定位到具体任务文件，再做最小修复。保留 apps/web/next-env.d.ts 的用户改动，禁止全仓自动格式化，禁止扩大范围重构。不要提交 git commit，由主 agent 统一提交。最终只报告验证命令结果、修复内容、仍存在的阻塞和生产启用建议。
```
