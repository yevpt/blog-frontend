# 账号安全模块 UI 设计与对接

> 用户详情页 `账号安全` Tab 的重构设计。当前实现为写死的假数据，本文定义其真实数据展示、交互流程与后端对接。
>
> 范围：`apps/web` 用户详情页 `SecurityTab` 及其子组件、`@repo/api` 客户端补全、`apps/web` 代理路由补全。**不含**后端改动（后端能力已全部就绪）。

## 1. 背景与目标

`SecurityTab`（`apps/web/app/users/[id]/_components/security-tab/security-tab.tsx`）目前只接收 `userId`，渲染硬编码内容，存在以下问题：

1. 用户名、邮箱等真实数据未展示。
2. 第三方绑定项与后端实际启用的平台不一致。
3. 登录密码未区分「未设置 / 已设置」两种状态。
4. 缺少换邮箱、设密码、找回密码、绑定、解绑的真实交互。
5. `@repo/api` 的 `OAuthBindingResp` 类型与后端不符，且缺多个方法。

目标：让该 Tab 展示真实数据，并对接后端已有的全部账号安全能力。该 Tab 仅在 `isOwner && isEditMode` 下展示，对应用户必为当前登录用户，故数据统一取自 `GET /users/me`。

## 2. 后端能力对照（已逐一核实）

### 2.1 读取

| 数据 | 来源 | 字段 |
| --- | --- | --- |
| 用户名 | `GET /users/me` | `username` |
| 是否已设密码 | `GET /users/me` | `password_set`（bool） |
| 主邮箱 | `GET /users/me` | `email`（可空） |
| 副邮箱 | `GET /users/me` | `meta.sub_email`（可空） |
| 对外展示邮箱 | `GET /users/me` | `setting.mail_show`（uint8） |
| 启用的第三方平台 | `GET /oauth/providers` | `string[]`（如 `["github","gitee","qq","weibo","baidu"]`） |
| 已绑定的平台 | `GET /oauth/bindings` | `{ source: string; social_user_id: number }[]` |

第三方列表 = `providers` 全集，逐项判断 `source` 是否出现在 `bindings` 中得出 `bound`。

### 2.2 写入（全部已就绪）

| 操作 | 接口 | 请求体 / 约束 |
| --- | --- | --- |
| 改用户名 | `PATCH /users/me/username` | `{ username }`，3–155 字符；成功后需重新登录 |
| 改密码（已设密码） | `PATCH /users/me/password` | `{ old_password, new_password }`，后端 min 6 |
| 设初始密码（未设密码） | `PATCH /users/me/password/initial` | `{ new_password(min 8), code(6 位) }`，需先向主邮箱发码 |
| 发账号邮箱验证码 | `POST /users/me/email/code` | `{ email, captcha_token }`，限流 strict，发 6 位码 |
| 换绑主/副邮箱 | `PATCH /users/me/email` | `{ target: "main"\|"sub", email, code(6 位) }` |
| 设对外展示邮箱 | `PATCH /users/me/email/display` | `{ display: "main"\|"sub"\|"none" }` |
| 解绑第三方 | `DELETE /oauth/bindings/:source` | 可能返回 `ErrLastLoginMethod`（最后登录方式，拒绝） |
| 绑定第三方（取授权地址） | `GET /oauth/:source/authorize?action=bind&redirect_uri=...` | OptionalAuth；返回 `{ authorize_url }` |
| 找回密码·发码（公开） | `POST /auth/password-reset/code` | `{ email, captcha_token }` |
| 找回密码·重置（公开） | `POST /auth/password-reset` | `{ email, code(6 位), new_password(min 8) }` |

### 2.3 图形验证码（已核实通用）

- `POST /captcha/register/challenge` → 滑块挑战；`POST /captcha/register/verify` `{ challenge_id, x, y }` → `{ captcha_token }`。
- 后端 `ConsumeRegistrationToken` 为注册 / 换邮箱发码 / 找回密码发码**共用**消费器：该 token **通用**、**一次性**、**IP 绑定**。
- 前端已有滑块 UI（`apps/web/components/auth/register-captcha.tsx`），但其编排逻辑（拉挑战、校验、产出 token）目前耦合在 `register-view.tsx` 内，需提取为可复用单元（见 §5）。

> **密码长度不一致**：改密码后端 min 6，设初始 / 找回 min 8。前端统一按 **≥8** 校验（更严格、对后端兼容），文案统一写「至少 8 位」。

## 3. 主列表设计

手机端为基准的纵向分组列表（沿用现有 `SecuritySection` / `SecurityItem` 行式结构，修正数据与状态），三个分组：

**登录凭证**
- 用户名 — 显示 `username` 真实值，右侧「修改」。
- 登录密码 — `password_set ? 「已设置」徽标 + 「修改」 : 「未设置」徽标 + 「设置」`。

**邮箱**
- 主邮箱 — 有值显示具体邮箱 + 「换绑」；无值显示灰字「未绑定」+ 「绑定」。
- 副邮箱 — 有值显示具体邮箱 + 「换绑」；无值显示灰字「未设置」+ 「添加」。
- 对外展示 — 真实下拉（主邮箱 / 副邮箱 / 不展示），值绑定 `mail_show`；副邮箱为空时禁用「副邮箱」选项；变更即调 `PATCH /users/me/email/display`，乐观更新 + 失败回滚。

**第三方绑定**（标题下注明来源 `/oauth/providers`）
- 按 `providers` 全量渲染，每项左侧平台图标 + 名称，右侧：`bound ? 绿色「已绑定」徽标 + 灰色「解绑」 : 灰色「未绑定」徽标 + 「绑定」`。
- 平台 `source → 展示名/图标` 的映射在前端维护一张常量表；未知 source 兜底显示原始 `source` 文本 + 通用图标。

数据加载：`SecurityTab` 改为 `'use client'`，挂载后并行拉 `getMe()`、`getProviders()`、`getOAuthBindings()`；加载态复用 `skeleton/`；任一失败显示行级错误 + 重试。任何写操作成功后重新拉取受影响数据刷新列表。

## 4. 交互流程（底部 Sheet）

所有多步操作用 `@repo/ui` 的 `Modal`，`placement="fullscreen-mobile"`（移动端底部 Sheet、`md+` 居中 Dialog），复用其抓手条 / 标题 / 关闭。

### 4.1 用户名
单字段 Sheet：输入新用户名（3–155）→ 提交 `updateUsername`。成功后提示「用户名已修改，需重新登录」并触发登出 / 跳登录（沿用项目现有登出逻辑）。

### 4.2 密码（三条流程，同一 Sheet 内切换）
- **A 修改密码**（`password_set === true`）：当前密码 + 新密码 + 确认 → `updatePassword`。底部「忘记原密码？用邮箱找回」链接切到 B。
- **B 找回密码**（由 A 链接进入）：主邮箱（只读）+ 图形验证 + 邮箱验证码 + 新密码 → `passwordResetCode` 发码 → `passwordReset` 重置。走**公开**接口，不需旧密码。
- **C 设置初始密码**（`password_set === false`，列表点「设置」直接进入）：主邮箱（只读）+ 图形验证 + 邮箱验证码 + 新密码 → `sendAccountEmailCode` 发码 → `setInitialPassword`。
- B 与 C 输入布局完全一致，仅调用的后端接口不同；二者共用同一个表单组件，按入口决定调用哪组接口。
- 找回流程（B）提取为可复用组件 `PasswordRecoveryForm`，登录页 `login-view.tsx` 现有的空壳「忘记密码？」按钮后续可直接复用它（本次顺带接通，属目标范围内的就近改进）。

### 4.3 邮箱（换绑 / 添加）
Sheet：新邮箱 + 图形验证 + 邮箱验证码（**验证码发往新邮箱**）→ `sendAccountEmailCode(newEmail)` → `updateEmail({ target, email, code })`。主邮箱入口 `target="main"`，副邮箱入口 `target="sub"`，共用同一组件。

### 4.4 第三方绑定 / 解绑
- **绑定**：点「绑定」→ `authorizeOAuth(source, "bind", redirectUri)` 取 `authorize_url` → 整页跳转第三方授权页 → callback 返回当前页 → 重新拉 `bindings` 刷新。`redirect_uri` 指回用户详情页。
- **解绑**：点「解绑」→ 轻量确认 `Modal`（`placement="center"`, `size="sm"`）→ `unbindOAuth(source)`。后端返回 `ErrLastLoginMethod` 等业务错误时用 toast 回显其文案，不刷新；成功则刷新列表。

### 4.5 发码按钮通用行为
「获取验证码」点击前必须先完成图形验证（拿到 `captcha_token`）；发码成功后按钮进入 60s 倒计时禁用；`429` 提示「发送过于频繁，请稍后再试」。

## 5. 组件与代码改动

### 5.1 `@repo/api`（`packages/api/src`）
- **修正** `OAuthBindingResp` 类型为 `{ source: string; social_user_id: number }`（`types/user.ts`）。
- **新增** 方法（`client.ts` `users` / 新增 `oauth` 命名空间，遵循 `extending-api` 三种 fetch 助手约定）：
  - `getProviders(): string[]` — `fetchPublic("/oauth/providers")`
  - `getOAuthBindings()` — 修正返回类型；端点维持 `/users/me/oauth-bindings`
  - `unbindOAuth(source)` — `fetchAuthed(DELETE "/oauth/bindings/:source")`
  - `authorizeOAuthBind(source, redirectUri)` — `fetchOptionalAuth(GET "/oauth/:source/authorize?action=bind&redirect_uri=...")`
  - `sendAccountEmailCode({ email, captcha_token })` — `fetchAuthed(POST "/users/me/email/code")`
  - `updateEmail({ target, email, code })` — `fetchAuthed(PATCH "/users/me/email")`
  - `setInitialPassword({ new_password, code })` — `fetchAuthed(PATCH "/users/me/password/initial")`
  - `passwordResetCode({ email, captcha_token })` — `fetchPublic(POST "/auth/password-reset/code")`
  - `passwordReset({ email, code, new_password })` — `fetchPublic(POST "/auth/password-reset")`
- **新增类型**：`UpdateEmailReq`、`SendAccountEmailCodeReq`、`SetInitialPasswordReq`、`PasswordResetCodeReq`、`PasswordResetReq`、`OAuthProvidersResp`（与后端 DTO 对齐）。

### 5.2 `apps/web` 代理路由（`app/api/...`）
现有：`me/meta`、`me/username`、`me/password`、`me/oauth-bindings`、`me/social/[platform]`、`me/email/display`、`oauth/providers`、`oauth/[source]/authorize`、`oauth/[source]/callback`。
**需新增**代理（均已核实当前不存在）：
- `POST app/api/users/me/email/code`
- `PATCH app/api/users/me/email`
- `PATCH app/api/users/me/password/initial`
- `DELETE app/api/oauth/bindings/[source]`
- `POST app/api/auth/password-reset/code`、`POST app/api/auth/password-reset`

captcha 代理 `app/api/captcha/register/challenge|verify` 已存在，直接复用。

### 5.3 `apps/web` 组件（`security-tab/`）
- `security-tab.tsx` 改为 `'use client'` 容器：取数 + 组合下列子组件。
- 子组件拆分（各自单一职责、独立可测）：
  - `security-list.tsx`（纯展示，受控）
  - `username-sheet.tsx`
  - `password-sheet.tsx`（内含 A/C 表单切换 + 嵌入 `PasswordRecoveryForm` 走 B）
  - `password-recovery-form.tsx`（可复用，登录页后续复用）
  - `email-sheet.tsx`（main / sub 共用）
  - `unbind-confirm.tsx`
  - `oauth-providers.ts`（source → 名称/图标 常量映射）
- **提取** 可复用图形验证码单元 `use-captcha-token.ts`（或 `captcha-verifier.tsx`），封装「拉挑战 → 滑块校验 → 产出一次性 `captcha_token`」，供邮箱发码 / 找回密码复用；同步重构 `register-view.tsx` 改用它（避免平行实现）。

### 5.4 测试（强制）
- `security-tab.test.tsx`：三组数据展示、`password_set` 两态、providers∪bindings 合并渲染。
- 各 Sheet 组件 `*.test.tsx`：关键交互（发码前需图形验证、提交参数正确、错误 toast）。
- `use-captcha-token` 测试。
- `@repo/api` 新增方法在 `client.test.ts` 补用例。
- 环境与 mock 配方遵循 `writing-tests` skill。

## 6. 边界与风险

- **无主邮箱用户**：B/C 流程依赖主邮箱发码。若 `email` 为空，密码相关入口应禁用并提示「请先绑定主邮箱」。
- **改用户名 / 改密码后需重新登录**：统一走项目现有登出流程，避免 token 失效后静默报错。
- **绑定跳转回跳**：`redirect_uri` 必须是允许的回跳地址，回来后要能定位到账号安全 Tab（可用 query 或锚点）。
- **解绑最后登录方式**：完全依赖后端校验 + 前端 toast，前端不预判。
- **限流**：邮箱发码 strict 限流，前端 60s 倒计时 + 429 文案兜底。
- **captcha token IP 绑定 + 一次性**：每次发码前重新校验图形验证码，不缓存复用 token。

## 7. 实施阶段建议

1. `@repo/api` 类型修正 + 方法补全 + 代理路由。
2. 主列表取数与展示（解决「数据没显示 / 平台不符」）。
3. 用户名 Sheet。
4. 密码三流程 + `PasswordRecoveryForm` + captcha 提取。
5. 邮箱换绑 / 添加 / 展示设置。
6. 绑定跳转 + 解绑确认。
7. 各阶段补测试。
