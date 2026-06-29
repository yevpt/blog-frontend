# Moderation Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development`, then follow repository skills `building-ui`、`writing-tests`.

**Goal:** 让站内系统通知准确展示审核通过、管理员修正后发布和审核驳回结果，并显示修正/驳回理由。

**Architecture:** 后端继续使用现有 `system_notice` 类型，通过 metadata 中的 `moderation.decision` 区分审核结果。本任务只扩展通知解析和展示，不新增 API、路由或申诉入口。

## 文件所有权

允许修改：

- `apps/web/components/notifications/**`。
- `apps/web/app/notifications/**`。
- `apps/web/store/use-notification-store.ts` 与测试，仅在审核通知刷新确有需要时修改。

禁止修改：

- `packages/api/**`。
- 评论、留言、碎语、admin 和基础审核文件。
- `apps/web/next-env.d.ts`。

## 后端通知契约

审核通知固定为：

```json
{
  "type": "system_notice",
  "source_type": "system",
  "root_type": "system",
  "title": "内容经管理员修正后已发布",
  "content_excerpt": "移除不当表述",
  "metadata": "{\"moderation\":{\"item_id\":10,\"revision_id\":20,\"decision\":\"corrected\"}}"
}
```

`decision` 只允许 `approved`、`corrected`、`rejected`。metadata 可能为空、非法 JSON 或来自其他系统通知，必须安全回退。

## 实施要求

### 1. 类型安全解析

- 在 `notification-type.ts` 扩展私有 metadata 类型，增加 moderation 子对象。
- 新增纯函数 `getModerationNotificationDecision(item)`，仅在 `type=system_notice` 且 decision 合法时返回联合类型，否则返回 null。
- 不使用 `as any`，非法 JSON 不抛异常。

### 2. 审核文案

- approved：动作文案“你的内容已通过审核”。
- corrected：动作文案“你的内容经管理员修正后已发布”。
- rejected：动作文案“你的内容审核未通过”。
- corrected/rejected 的 `content_excerpt` 作为理由完整可读展示，不能只放在 title tooltip。
- approved 没有理由时不渲染空正文块。
- 其他 `system_notice` 保持现有通用文案，不因审核解析影响。

### 3. 交互

- 审核通知没有点赞和回复操作。
- 不提供恢复原文、申诉、举报或重新编辑按钮。
- 当前 metadata 没有 content type/content ID，不能安全跳转原内容；卡片点击保持在通知页，不根据 item_id 猜业务 URL。
- 系统通知不显示为某个普通用户发布，继续使用“系统通知”身份。

### 4. 可访问性与兼容

- 理由文本使用现有 `NotificationExcerptContent` 或等价的安全 Markdown/纯文本展示，不直接注入 HTML。
- unread、选择、长按和标记已读行为保持不变。
- 非审核通知的现有测试不得回归。

## TDD 验收用例

至少覆盖：

1. 三种合法 decision 的解析和动作文案。
2. corrected 展示修正理由，rejected 展示驳回理由。
3. approved 空 excerpt 不渲染空块。
4. 非法 JSON、未知 decision 和普通 system_notice 安全回退。
5. 审核通知没有点赞、回复和内容跳转。
6. 原有评论、点赞、留言通知行为不变。

## 验证命令

```bash
pnpm --filter web exec vitest run components/notifications app/notifications store/use-notification-store.test.ts
pnpm --filter web check-types
pnpm --filter web lint
pnpm exec prettier --check apps/web/components/notifications apps/web/app/notifications apps/web/store/use-notification-store*
```

## 可直接交给 agent 的提示词

```text
你在 /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend 的 dev 分支工作。请完整执行 docs/moderation/agents/05-moderation-notifications.md。

开始前阅读根 AGENTS.md，以及 .agents/skills/building-ui/SKILL.md、writing-tests/SKILL.md，并严格按 TDD 实现。

只修改文档授权的 notifications 文件。不要修改 packages/api、评论、留言、碎语、admin、基础审核文件或 apps/web/next-env.d.ts。当前后端 metadata 不含业务内容定位信息，禁止猜 URL。若需要越界，停止并报告。不要提交 git commit，由主 agent 统一整合。完成后运行文档验收命令，简洁汇报改动、验证结果和剩余风险。
```
