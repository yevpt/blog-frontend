# 前端错误处理统一化 — 任务清单

> 目标：让全站的「业务/网络错误」都展示后端返回的**具体原因**（右下角全局 toast），并为有后端约束的输入补齐**前端校验**。
> 起因：评论弹窗超长文本时，后端已返回「内容长度不能超过 2000 个字符」，但前端丢弃了它、只显示写死的「发布失败，请稍后重试」。

## 0. 统一范式（每个任务都遵守）

**错误展示统一用 helper：**

```ts
import { getApiErrorMessage } from "@/lib/client-fetch";
// 业务/网络错误 → 右下角全局 toast，优先展示后端 message
addToast(getApiErrorMessage(err, "<动作>失败，请稍后重试"), "error");
```

- `getApiErrorMessage(err, fallback)`：信任 `ApiClientError`/`ApiError` 的 `message`，其余（网络异常等）回退 `fallback`。已实现并测试，**不要重写**。
- `addToast` 来自 `@/lib/toast`，签名 `addToast(message, "error" | "success" | "info")`。

**已落地的参照范式（照抄）：**
- Hook 改造样板：`apps/web/hooks/use-comment-submit.ts`
- 输入校验样板：`apps/web/components/comments/inputs/pill-comment-input.tsx`（`maxLength` + 接近上限字数计数器）

**呈现规则：**
- 业务/网络错误 → **全局 toast**（不再用内联 `setError` 红字）。
- 例外：登录/注册等**表单页**保留就地内联提示（仍要用 `getApiErrorMessage` 取真实 message）。
- 可前端预防的约束（长度/必填）→ 输入组件 `maxLength` + 计数器，**提交前拦截**。

**后端字段长度上限（镜像到前端 `maxLength`）：**

| 内容 | 上限 |
|---|---|
| 评论 / 回复 / 留言 content | 2000 |
| 碎语 content | 800 |
| 昵称 nickname | 150 |
| 身份标签 mark | 200 |
| 简介 description | 1000 |
| 个人站点 site | 500 |
| 用户名 username | 3–155 |

## 1. 每个任务的「完成定义」（DoD）

1. 按范式改完代码，**禁 `any`**（用 `unknown`/精确类型），非显然逻辑写中文注释。
2. 补/改对应测试（`*.test.ts` / `*.test.tsx`），**缺测 = 未完成**。
3. 本任务相关测试通过：`pnpm --filter web exec vitest run <改动涉及的测试文件>`。
4. 类型与 lint 通过：`pnpm --filter web exec tsc --noEmit` 且 `pnpm --filter web exec eslint <改动文件>`。
5. 勾选下方对应 checkbox，按 `git-commit` skill 写中文 Conventional Commits 提交（一个任务一个提交）。

---

## A 组 · 提交类 hook 改 toast（与评论同构，优先做 A1）

- [x] **A1 · 留言提交（与评论完全同构，最大一块）**
  - 文件：`apps/web/hooks/use-guestbook-submit.ts`、`apps/web/components/guestbook/guestbook-input-bar.tsx`，及其引用视图。
  - 步骤：完全照搬评论样板——
    1. hook 的 catch（`:27`、`:59`）改为 `addToast(getApiErrorMessage(err, "发布失败，请稍后重试"/"回复失败，请稍后重试"), "error")`；401 → `addToast("请先登录","error")`。
    2. 删除 hook 的 `error`/`clearError` 返回，及 `guestbook-input-bar` 的 `submitError` 内联红字与上游 plumbing。
    3. 输入框加 `maxLength={2000}` + 接近上限计数器（抄 `pill-comment-input.tsx`）。
  - 测试：改 `guestbook-input-bar.test.tsx`、`use-guestbook-submit` 测试；新增「业务错误 toast 展示后端 message」用例（参照 `use-comment-submit.test.ts`）。
  - **注：步骤3（maxLength+计数器）经确认归入 B1 一起做**——留言用的 `RichCommentInput` 是 Tiptap 编辑器非 textarea，需改 `rich-comment-input.tsx`（B1 的文件），统一在 B1 落地。

- [x] **A2 · 文章点赞**
  - 文件：`apps/web/hooks/use-article-engagement.ts:41`
  - 步骤：`addToast("点赞失败，请稍后重试","error")` → `addToast(getApiErrorMessage(err, "点赞失败，请稍后重试"),"error")`。
  - 测试：更新该 hook 测试断言。

- [x] **A3 · 列表内点赞/更新/删除**
  - 文件：`apps/web/hooks/use-article-list.ts:125`、`apps/web/hooks/use-moment-list.ts:258,305,375`
  - 步骤：把 `err instanceof ApiClientError ? err.message : "..."` 统一替换为 `getApiErrorMessage(err, "...")`（保留原兜底文案与「取消点赞/点赞」分支文案）。
  - 测试：更新相关测试。

- [x] **A4 · 碎语弹窗（snippet-modal）**
  - 文件：`apps/web/components/snippets/snippet-modal.tsx:74,94,102,104`
  - 步骤：`addToast(err instanceof Error ? err.message : "...")` → `addToast(getApiErrorMessage(err, "..."))`；`throw new Error("编辑失败")` 改为透传 `data.error ?? "编辑失败"`（与 `:94` 发布分支一致）。
  - 测试：`snippet-modal.test.tsx`。

---

## B 组 · 前端校验补齐（镜像后端约束，上限见 §0）

- [x] **B1 · inline 评论输入**
  - 文件：`apps/web/components/comments/inputs/rich-comment-input.tsx`
  - 步骤：加 `maxLength={2000}` + 接近上限计数器（与 `pill-comment-input.tsx` 一致）。
  - 测试：补 `rich-comment-input.test.tsx` 的 maxLength/计数器用例。

- [x] **B2 · 碎语正文**
  - 文件：`apps/web/components/snippets/snippet-modal.tsx`
  - 步骤：正文输入加 `maxLength={800}`（碎语上限 800）+ 计数器。
  - 测试：`snippet-modal.test.tsx` 补 maxLength 用例。
  - **注：已核对，无需改动代码**——`MAX_CONTENT=800` 常量、`overLimit` 提交前拦截、footer `{content.length}/{MAX_CONTENT}` 计数器（超限变红）均已存在。补计数器显示用例。

- [x] **B3 · 用户资料内联编辑器**
  - 文件：`apps/web/app/users/[id]/_components/inline-field-editor.tsx`、`select-inline-editor.tsx`、`inline-date-editor.tsx`
  - 步骤：按字段加 `maxLength`——昵称 150 / 身份标签 mark 200 / 简介 description 1000 / 站点 site 500。各编辑器若已通过 prop 区分字段，则把上限作为 prop 传入；否则在调用处按字段指定。
  - 测试：对应组件测试补 maxLength 断言。

---

## C 组 · 表单页/列表（保留内联，但展示真实 message）

> 这些场景**保留内联提示**（表单/列表更适合就地展示），仅把硬编码兜底替换为 `getApiErrorMessage(err, fallback)`。

- [x] **C1 · 登录/注册**
  - 文件：`apps/web/components/auth/login-view.tsx:61,65,70`、`apps/web/app/(auth)/register/page.tsx:31,54`、`apps/web/app/(auth)/login/page.tsx:33`、`apps/web/hooks/use-register-form.tsx:148,217`
  - 步骤：`setError("...写死...")` 的兜底分支改用 `getApiErrorMessage(err, "...原兜底...")`；已用 `json.message || "..."` 的保留。
  - 测试：更新相关测试断言。

- [ ] **C2 · 列表加载失败**
  - 文件：`apps/web/hooks/use-comment-list.ts:52`、`apps/web/hooks/use-guestbook-list.ts:48`、`apps/web/components/comments/parts/comment-replies.tsx:188`
  - 步骤：加载失败 `setError("...")` 改用 `getApiErrorMessage(err, "...原兜底...")`，保留内联展示。
  - 测试：更新相关测试。

- [ ] **C3 · OAuth**
  - 文件：`apps/web/components/auth/oauth-grid.tsx:92,123,133`、`apps/web/app/oauth/[source]/callback/page.tsx:60,64,71`
  - 步骤：已用 `data.message ?? "..."` 的保留；纯写死兜底（如 `:133`、`:71` 的「网络异常」）保持不变（属网络层兜底，合理）。本任务以核对为主，**无明显改动时直接勾选并说明「已核对，无需改动」**。

---

## D 组 · 后端一致性巡检（仓库：`blog-backend`）

> 在 `blog-backend` 仓库执行。验证为主，发现不一致才改。

- [x] **D1 · 碎语图片上传错误映射** — 已核对：`bindMomentSaveReq` → `response.Fail(CodeBadRequest, err.Error())`，走统一信封 400 + 具体文案（如「图片不能超过 1MB」「GIF 图片过大…」），**无需改动**。

- [ ] **D2 · 全量 handler 无裸 `c.JSON`**
  - 命令：`grep -rn 'c.JSON(' internal/handler --include='*.go' | grep -v _test.go | grep -v 'response\.'`
  - 期望：空输出（所有响应都走 `pkg/response`）。若有命中，改为对应 `response.*`；改完跑 `go test ./internal/handler/...`。

- [ ] **D3 · BFF 路由透传后端 message**
  - 仓库：`blog-frontend`，文件：`apps/web/app/api/**/route.ts`
  - 检查：每个 route handler 在后端非 2xx 时，是否把后端 `message` 写进返回的 `{ error: <message> }`（供 `throwApiClientError` 读取）。找出**丢弃后端 message、只回写死文案或状态码**的路由并补齐。
  - 命令辅助：`grep -rn 'NextResponse.json' apps/web/app/api --include='route.ts'`
  - 测试：对补齐的 route 补/改其 `route.test.ts`。

---

## 不要做 / 注意

- 不要重写 `getApiErrorMessage`、不要新增第二个 toast 系统。
- 不要把登录/注册表单的内联提示改成 toast（C 组例外规则）。
- 不引入新依赖（不上 react-hook-form/zod）。
- 一个任务一个 commit；改了某 hook/组件的接口要同步改其调用方与测试，否则 `tsc` 会红。
