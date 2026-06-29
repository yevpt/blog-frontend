# Admin Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development`, then follow repository skills `building-admin-module`、`building-ui`、`extending-api`、`writing-tests`.

**Goal:** 新增完整的管理后台审核模块，支持审核队列、通过/驳回/修正、全站控制、用户治理和紧急隐藏恢复。

**Architecture:** 新模块完全位于 `apps/admin/src/modules/moderation/`，数据通过已有 `apiClient.moderation` 获取。页面按“审核队列、全站控制、用户治理”三个区域组织；列表沿用 admin 的查询、移动列表、DataTable 和 Modal 模式，不引入新状态库或依赖。

## 文件所有权

允许修改：

- 新建 `apps/admin/src/modules/moderation/**`。
- `apps/admin/src/config/modules.ts` 与 `modules.test.ts`。

禁止修改：

- `packages/api/**`。
- 其他 `apps/admin/src/modules/**`。
- web 应用、基础审核文件和 `apps/web/next-env.d.ts`。

## 模块结构

至少采用以下职责拆分：

```text
apps/admin/src/modules/moderation/
  ModerationPage.tsx
  ModerationPage.test.tsx
  module.tsx
  model.ts
  model.test.ts
  hooks/use-moderation-list.ts
  hooks/use-moderation-list.test.ts
  hooks/use-moderation-control.ts
  hooks/use-moderation-control.test.ts
  hooks/use-moderation-user.ts
  hooks/use-moderation-user.test.ts
  components/ModerationListToolbar.tsx
  components/ModerationReviewDialog.tsx
  components/ModerationControlPanel.tsx
  components/ModerationUserPanel.tsx
```

组件继续按职责细分，单文件不要超过约 250 行。模块在 `config/modules.ts` 注册一次，路径 `/moderation`，侧边栏图标使用现有 `shield`。

## 实施要求

### 1. 审核队列

- 默认筛选 `review_status=pending`，支持 page/page_size、content_type、risk_level、review_status。
- 桌面使用 `DataTable`，移动端提供可读卡片列表。
- 列表至少展示内容类型、作者 ID、提交正文摘要、风险、策略动作、审核状态、创建时间。
- 详情展示 `submitted_content` 和当前 `published_content`，清楚区分原始提交与公开版本。
- 碎语详情展示 `moment_options`。

### 2. 人工审核

- 通过调用 `approveItem(item_id, { revision_id, lock_version, reason })`。
- 驳回必须填写理由并调用 `rejectItem`。
- 修正必须填写修正文和修正理由，调用 `correctItem`；禁止原地覆盖详情对象后假装成功。
- 成功后关闭弹窗、toast，并重新拉取当前页。
- `ApiError.code === "MODERATION_REVIEW_CONFLICT"` 时显示“审核状态已经变化”，重新获取该 item 和当前列表，不自动重放旧操作。
- `lifecycle_state=deleted` 时禁用 approve/reject/correct；前端不得提供恢复删除内容按钮。

### 3. 紧急隐藏与恢复

- 已公开且未紧急隐藏的 item 可填写原因后调用 `hideItem`。
- `public_state=emergency_hidden` 可调用 `restoreItem`。
- 恢复按钮不对 `lifecycle_state=deleted` 显示。
- 操作后使用返回的 `public_state`、`lock_version` 更新或重新拉取，不自行猜状态。

### 4. 全站控制

- 加载 `getControl()`，编辑 registration mode、publishing mode 和 reason。
- 保存时必须携带当前 `lock_version`。
- 明确展示 `open`、`pre_review_all`、`closed` 的影响，危险操作需要二次确认。
- 冲突时重新加载控制状态，不覆盖服务端新值。

### 5. 用户治理

- 管理员输入用户 ID 后查询 `getUserProfile`。
- 展示信任等级、来源、手工锁定、违规分、连续通过、修正/驳回/高风险次数、处罚状态与期限。
- 支持 `updateUserProfile`、`muteUser`、`banUser`、`releaseUser`。
- 禁言/封禁必须填写理由；期限可为空表示由后端策略处理。
- 按用户隐藏/恢复内容使用 cursor 分批接口；每次显示 processed、next_cursor、has_more，由管理员点击继续下一批，不在浏览器自动无限循环。

### 6. 明确排除

- 不实现举报、申诉、审核规则 CRUD、图片语义审核和 IP 段批量操作。
- 不在现有评论/留言/碎语管理模块重复加审核操作。

## TDD 验收用例

至少覆盖：

1. 模块注册、导航路径和 route 唯一性。
2. 列表筛选准确传给 `apiClient.moderation.listItems`。
3. loading/error/empty/success 和移动/桌面展示。
4. approve/reject/correct 请求携带 revision_id 与 lock_version。
5. 驳回和修正理由为空时不发请求。
6. 字符串冲突错误码触发刷新，不重复旧审核操作。
7. deleted item 没有审核和恢复操作。
8. 控制更新携带 lock_version。
9. 用户画像修改、禁言、封禁、释放。
10. 用户内容批处理严格按 cursor 单批推进。

## 验证命令

```bash
pnpm --filter admin exec vitest run src/modules/moderation src/config/modules.test.ts
pnpm --filter admin check-types
pnpm --filter admin lint
pnpm --filter admin build
pnpm exec prettier --check apps/admin/src/modules/moderation apps/admin/src/config/modules.ts apps/admin/src/config/modules.test.ts
```

## 可直接交给 agent 的提示词

```text
你在 /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend 的 dev 分支工作。请完整执行 docs/moderation/agents/04-admin-moderation.md。

开始前阅读根 AGENTS.md、apps/admin/AGENTS.md，以及 .agents/skills/building-admin-module/SKILL.md、building-ui/SKILL.md、extending-api/SKILL.md、writing-tests/SKILL.md。严格使用 TDD。

只能新建/修改 apps/admin/src/modules/moderation/** 和文档授权的 config/modules 文件。不要修改 packages/api、其他 admin 模块、web、基础审核文件或 apps/web/next-env.d.ts。若接口契约不足，停止并报告主 agent，不要自行越界。不要提交 git commit，由主 agent 统一整合。完成后运行文档验收命令，只汇报改动、验证结果和剩余风险。
```
