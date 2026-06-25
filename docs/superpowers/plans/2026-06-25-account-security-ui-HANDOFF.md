# 账号安全模块 — 交接文档（Tasks 7–11）

> 给接手者（Codex）：本文件 + 计划 `2026-06-25-account-security-ui.md` + spec `../specs/2026-06-25-account-security-ui-design.md` 是你的完整上下文。
> **先读本文件的「关键纠偏」，再读计划。** 计划里 Tasks 7–11 的 `apiClient.users.*` 写法**已过时**，按本文纠偏执行。

## 现状

- **Tasks 1–6 已完成并逐个评审通过**，提交（线性历史，夹杂用户无关 WIP 提交）：
  - `659acf1` feat(api): @repo/api 账号安全方法/类型
  - `8d075f9` feat(web): 6 个后端代理路由
  - `72667a1` feat(security): 第三方平台映射 `oauth-providers.ts`
  - `acc804e` refactor(captcha): 提取 `useCaptchaToken`
  - `ae4b079` feat(security): 账号安全列表对接真实数据（容器+列表）
  - `6f0e95d` feat(security): 用户名修改 Sheet
- **剩余：Tasks 7、8、9、10、11**（邮箱 Sheet / 展示下拉 / 密码 Sheet / 绑定解绑 / 回跳定位+全量校验）。
- 进度 ledger：`.superpowers/sdd/progress.md`（含历次 Minor findings，供最终评审 triage）。
- 工作树目前**干净且可构建**（`pnpm -r check-types && pnpm -r lint` 全绿）。

## 已建成的代码（Tasks 7–11 要在其上扩展）

目录 `apps/web/app/users/[id]/_components/security-tab/`：
- `security-tab.tsx` — `'use client'` 容器。内有 `dispatch(action)`：`username` 分支已接 Sheet+登出；`password`/`email`/`bind`/`unbind`/`display` 分支目前是 `console.warn` 占位，**你要逐个接上**。
- `use-account-security.tsx` — 取数 hook，导出 `useAccountSecurity()` 返回 `{ data: SecurityData|null, loading, error, reload }`。**`SecurityData` 与 `SecurityAction` 类型定义在这里/security-tab.tsx，先读它们。**
- `security-list.tsx` — 受控纯展示 `{ data, onAction }`，三组渲染（对外展示行当前是只读文本占位，Task 8 换成交互下拉）。
- `oauth-providers.ts` — `getProviderMeta(source) => {label, short, color}`。
- `username-sheet.tsx` — 可参照的 Sheet 实现范例（@repo/ui Modal/Input/Button + apiJson + addToast）。

## 关键纠偏（务必遵守，否则会踩坑）

### 1. 客户端取数：用 `@/lib/client-fetch` 的 `apiJson`，不是 `@repo/api` client
计划里写的 `apiClient.users.xxx()` **不适用于客户端组件**。web 客户端组件的约定（见 `hooks/use-profile-editor.ts`、`username-sheet.tsx`）：
```ts
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
// 成功：proxy 已解包信封，直接拿到 data；失败：抛 ApiClientError（带后端中文 message）
await apiJson<void>("/api/users/me/email", { method: "PATCH", body: JSON.stringify({ target, email, code }) });
// 错误展示：addToast(getApiErrorMessage(err, "操作失败"), "error")
```
类型从 `@repo/api` 引入（`UserDetailResp`/`UpdateEmailReq` 等已在 Task 1 加好）。

### 2. providers 例外：`/api/oauth/providers` 路由**不解包**
该路由返回原始 `{ code, data }` 信封。**不要用 apiJson 读它，也不要改这个路由**（`oauth-grid.tsx` 依赖其信封形状，改了会破坏登录页）。读法见 `use-account-security.tsx` 里的 `fetchProviders`：plain `fetch` + 读 `.data`。Task 10 取绑定授权地址 `/api/oauth/:source/authorize?action=bind` 同理需确认其返回是否解包（用前先看对应代理路由实现）。

### 3. 基础组件一律 `@repo/ui`，禁裸 `<button>`/`<input>`/`<select>`
- `Modal`：`placement="fullscreen-mobile"`（移动端底部 Sheet、md+ 居中），`isDismissable`，`aria-label`。
- `Input`：react-aria，`onChange` 签名是 `(value: string) => void`（不是 event），`label` 自动关联（测试用 `getByLabelText`）。
- `Button`：用 `variant`（**无 color prop**）、`isLoading`/`loadingText`、`isDisabled`。
- toast：项目用 `addToast(msg, "success"|"error")`（**不是 useToast**），确认 import 来源（见 username-sheet.tsx / register-view.tsx）。
- `Select`（Task 8）：先读 `packages/ui/src/index.ts` 与现有用法确认 API。
- 先 `cat packages/ui/src/index.ts` 看导出；不确定某组件 props 就看现有用法，别猜。

### 4. 图形验证码：复用 `useCaptchaToken`（Task 4 已建）
`apps/web/hooks/use-captcha-token.tsx` 导出 `useCaptchaToken({ onToken, onRateLimited })`，返回 `{ captchaOpen, captchaChallenge, captchaX, captchaLoading, setCaptchaX, setCaptchaOpen, openCaptcha, handleVerify, closeCaptcha }`。配合 `components/auth/register-captcha.tsx` 的 `RegisterCaptcha`（props：`challenge / captchaX / captchaOpen / captchaLoading / onOpenChange / onCaptchaXChange / onVerify / onClose`）渲染滑块。
- 邮箱 Sheet（Task 7）：`useCaptchaToken({ onToken: async (t) => { await apiJson("/api/users/me/email/code", {method:"POST", body: JSON.stringify({ email: newEmail, captcha_token: t })}); startCountdown(); }, onRateLimited: m => addToast(m,"error") })`，「获取验证码」按钮 `onClick={openCaptcha}`。
- 找回密码（Task 9 的 B 流程）：`onToken: t => apiJson("/api/auth/password-reset/code", {method:"POST", body: JSON.stringify({ email, captcha_token: t })})`。
- token 通用（后端消费器共用），端点固定 `/api/captcha/register/*`，无需改。

### 5. 改用户名/改密码成功后登出
`await fetch("/api/auth/logout", { method: "POST" })` 然后 `router.refresh()`（`useRouter` from `next/navigation`）。放在容器 `onSuccess` 回调（见 security-tab.tsx username 分支 + navbar-user-menu.tsx:71-79）。

### 6. **严禁绕过 git 钩子**
不得用 `--no-verify` / `SKIP_SIMPLE_GIT_HOOKS`。pre-commit 跑全树 `pnpm -r check-types && pnpm -r lint`、commit-msg 强校验。若提交被你改动**之外**的全树报错挡住，停下排查/上报，不要绕过（这是硬约束，违反会被拒）。

### 7. Sheet 内部状态在 `open` false→true 时 reset
多输入 Sheet（邮箱/密码）打开时要清空上次输入/验证码/倒计时，避免残留。

### 8. 提交规范
- commit message Conventional-Commits 中文格式（`scripts/validate-commit-msg.cjs` 强校验），如 `feat(security): 邮箱换绑与添加 Sheet`。
- 每个任务一次提交，只精确 `git add` 本任务文件，**禁止 `git add -A`**（仓库可能有用户的无关 WIP）。
- 强制测试：组件 `*.test.tsx`（jsdom）。mock `@/lib/client-fetch` 的 `apiJson`（用 `importActual` 保留 `getApiErrorMessage` 真实实现），断言真实行为（请求 path/body、disabled、错误 toast）。配方见 `.agents/skills/writing-tests/SKILL.md`。

## 剩余任务（详细 Step 见计划 Task 7–11，按上述纠偏调整 API 写法）

- **Task 7 邮箱 Sheet** `email-sheet.tsx`：`{open, target:"main"|"sub", currentEmail, onClose, onSuccess}`。新邮箱 + RegisterCaptcha + 验证码（发往**新邮箱**）+ 提交 `PATCH /api/users/me/email {target,email,code}`。主/副邮箱共用，标题按 target+是否已有邮箱。60s 倒计时、429 文案。容器接 `{type:"email",target}` 分支，`onSuccess=reload`。
- **Task 8 展示下拉** `email-display-select.tsx`：`@repo/ui` `Select`，值 `main|sub|none`（由 `mailShow` 映射，**实现前 grep 后端 service 确认 mail_show 数值↔语义**），副邮箱不存在时禁用 sub。变更乐观更新 → `PATCH /api/users/me/email/display {display}` 失败回滚。接入 `security-list.tsx` 对外展示行（替换只读占位），`onChanged=reload`。
- **Task 9 密码 Sheet** `password-recovery-form.tsx`(可复用) + `password-sheet.tsx`：`passwordSet=true` → A(改密 `PATCH /api/users/me/password {old_password,new_password}`)+「忘记原密码」切 B(找回，公开 `password-reset/code`+`password-reset`)；`passwordSet=false` → C(设初始 `email/code`+`PATCH /api/users/me/password/initial {new_password,code}`)。主邮箱只读、新密码≥8。`mainEmail` 空时禁用 B/C 并提示「请先绑定主邮箱」。成功登出。容器接 `{type:"password"}`。
- **Task 10 绑定/解绑** `unbind-confirm.tsx`：解绑 `Modal placement="center" size="sm"` → `DELETE /api/oauth/bindings/:source`，后端 `ErrLastLoginMethod` 等错误 toast 回显不刷新，成功 reload。绑定：容器 `{type:"bind",source}` → 取 `/api/oauth/:source/authorize?action=bind&redirect_uri=${origin}/users/${userId}?tab=security` 的 authorize_url → `window.location.href` 跳转。
- **Task 11 回跳定位** `user-profile-tabs.tsx`：`?tab=security` 时初始选中账号安全 Tab（`useSearchParams`）。补 `user-profile-tabs.test.tsx`。最后跑 `pnpm -r check-types && pnpm -r lint && pnpm --filter web test` 全绿。

## 收尾后建议
跑一次全分支评审（spec 全覆盖 + 处理 ledger 里的 Minor，尤其 **SecurityItem 裸 button 迁移到 @repo/ui Button** 这条 fix-forward 债）。第三方图标可考虑改用 `@repo/icons` 真实品牌图标（github/qq/weibo/gitee/baidu，oauth-grid 在用），替代当前短码方块。
