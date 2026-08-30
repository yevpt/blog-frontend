# 注册发码环节提示「邮箱已注册」设计

日期：2026-07-03
范围：

- 后端 `../blog-backend`：`internal/service/auth/auth.go`、`internal/handler/auth/auth.go`、`pkg/response/response.go`
- 前端本仓库：`apps/web/hooks/use-captcha-token.tsx`、`apps/web/hooks/use-register-form.tsx`、`apps/web/components/auth/register-view.tsx`

## 背景与问题

注册流程：填邮箱 → 点「获取验证码」→ 拉图形验证码 → 完成滑块 → 后端发邮件验证码 → 填验证码 + 密码 → 提交注册。

目前「邮箱已注册」的校验只在最后提交注册（`Register`）时才做（`s.repo.ExistsByEmail` 命中返回 `ErrEmailTaken`）。用户要走完滑块验证、等邮件之后，提交时才被告知邮箱已注册，体验较差。且滑块验证通过后调用的发码接口 `POST /auth/send-code`（`SendCode`）完全没有查重。

此外发现一个前置 bug：滑块验证通过后触发的发码请求由 `use-captcha-token.tsx` 的 `handleVerify` 统一处理，其 catch 分支把「滑块验证失败」和「发码业务请求失败」混在一起——非限流（429）错误一律静默重拉一张新的滑块图，不会把错误信息暴露给上层。这意味着即使后端现在在 `SendCode` 里加了「邮箱已注册」校验，前端也看不到提示，只会看到验证码框莫名其妙刷新。此 hook 被注册、改邮箱、设初始密码、邮箱找回密码共 4 处复用，必须先修好这个信息暴露路径。

## 目标

1. 点击「获取验证码」→ 完成滑块验证后，若邮箱已注册，前端立刻显示「该邮箱已被注册」等友好提示，并提供「去登录」入口，不必等到提交注册那一步。
2. 前端要能明确区分「邮箱已注册」和其它发码失败原因（如图形验证码票据失效），因为只有前者需要展示「去登录」按钮。
3. `use-captcha-token.tsx` 的改动只新增可选能力，不影响改邮箱/设初始密码/邮箱找回密码这三个现有调用方的行为。
4. `Register` 接口现有的邮箱查重逻辑保持不变，作为兜底防御（如用户绕过发码步骤直接提交、多标签页竞态）。

## 后端设计（blog-backend）

### `internal/service/auth/auth.go` — `SendCode`

在「消费图形验证码票据」之后、「生成验证码」之前，插入邮箱查重：

```go
if err := s.captchaConsumer.ConsumeRegistrationToken(captchaToken, ip); err != nil {
    return err
}

taken, err := s.repo.ExistsByEmail(to)
if err != nil {
    return err
}
if taken {
    return ErrEmailTaken
}
```

`ExistsByEmail`、`ErrEmailTaken` 均为现成方法/变量（`Register` 已在用），不新增。不做 `normalizeEmail`，与 `Register` 现有调用方式保持一致。

### `pkg/response/response.go`

新增一个字符串错误码常量，放在现有 `CodeContentRiskRejected` 等常量旁边：

```go
CodeAuthEmailTaken = "AUTH_EMAIL_TAKEN"
```

复用现成的 `Conflict(c, errorCode, message)` helper（HTTP 409 + `Code: 409` + `ErrorCode`），不新增响应函数。

### `internal/handler/auth/auth.go` — `SendCode` handler

在现有的限流判断之后、通用兜底之前，新增一个分支：

```go
if err := h.svc.SendCode(req.Email, c.ClientIP(), req.CaptchaToken); err != nil {
    if isTooManyRequests(err) {
        response.TooManyRequests(c, err.Error(), 0)
        return
    }
    if errors.Is(err, authservice.ErrEmailTaken) {
        response.Conflict(c, response.CodeAuthEmailTaken, err.Error())
        return
    }
    response.Fail(c, response.CodeBadRequest, err.Error())
    return
}
```

**为什么不能直接复用现有的 400 兜底**：`SendCode` 目前唯一的非限流失败原因是「图形验证码票据无效」，也走 400。如果邮箱已注册也归入同一个 400，前端将无法区分「验证码失效，请重试」与「邮箱已注册，去登录」，也就无法决定是否展示「去登录」按钮。用 409 + `error_code` 是现成设计（目前仅审核模块在用），改动量最小地引入这个可区分信号。

## 前端设计（blog-frontend）

### `apps/web/hooks/use-captcha-token.tsx`

1. `ApiEnvelope<T>` 新增 `error_code?: string`；`CaptchaApiError` 新增只读字段 `errorCode: string | null`；`postJson` 透传该字段。
2. `UseCaptchaTokenOptions` 新增可选回调：

```ts
/** onToken 抛出非限流错误时的提示回调（message 直接来自后端，errorCode 用于细分场景，如「邮箱已注册」） */
onError?: (message: string, errorCode: string | null) => void;
```

3. `handleVerify` 拆分为两段：

```ts
const handleVerify = useCallback(
  async (x: number) => {
    if (!captchaChallenge) return;
    setCaptchaLoading(true);

    let verifyResult: CaptchaVerifyResp;
    try {
      verifyResult = await postJson<CaptchaVerifyResp>("/api/captcha/register/verify", {
        challenge_id: captchaChallenge.challenge_id,
        x,
        y: captchaChallenge.tile_y,
      });
    } catch (err) {
      if (isRateLimited(err)) {
        closeCaptcha();
        onRateLimited?.(err instanceof Error ? err.message : "发送过于频繁");
      } else {
        // 滑块验证请求本身失败：重拉一张新挑战，让用户重试；连重拉都失败才关闭
        try {
          await fetchChallenge();
        } catch {
          closeCaptcha();
        }
      }
      setCaptchaLoading(false);
      return;
    }

    try {
      await onToken(verifyResult.captcha_token);
      closeCaptcha();
    } catch (err) {
      closeCaptcha();
      if (isRateLimited(err)) {
        onRateLimited?.(err instanceof Error ? err.message : "发送过于频繁");
      } else {
        const errorCode = err instanceof CaptchaApiError ? err.errorCode : null;
        onError?.(err instanceof Error ? err.message : "操作失败", errorCode);
      }
    } finally {
      setCaptchaLoading(false);
    }
  },
  [captchaChallenge, closeCaptcha, fetchChallenge, onToken, onRateLimited, onError],
);
```

行为变化仅限于「`onToken` 抛出非限流错误」这一种情况：从「静默重拉验证码图」变为「关闭验证码弹层 + 通过 `onError` 把消息暴露出去」。滑块验证请求本身失败的重试逻辑不变。`onError` 不传时（改邮箱、设初始密码、邮箱找回密码三处现状）等价于关闭弹层但不提示，属于合理默认（这三处目前也没有对应 UI 展示位）。

### `apps/web/hooks/use-register-form.tsx`

- 新增 state：`const [emailTaken, setEmailTaken] = useState(false);`，并在返回值中导出。
- `openCaptcha`（每次重新发起）和 `submitRegistration` 开始时重置为 `false`。
- `useCaptchaToken` 调用新增：

```ts
onError: (message, errorCode) => {
  setApiError(message);
  setEmailTaken(errorCode === "AUTH_EMAIL_TAKEN");
},
```

### `apps/web/components/auth/register-view.tsx`

在现有 `apiError` 提示（第 245-249 行）下方，`emailTaken` 为真时追加一个「去登录」按钮，直接调用组件已有的 `onSwitchToLogin` prop（顶部「登录」按钮已在用同一个 prop，无需新增 prop 或跳转逻辑）：

```tsx
{
  apiError && (
    <p role="alert" className="mt-3 text-[12px] leading-relaxed text-destructive/80">
      {apiError}
    </p>
  );
}
{
  emailTaken && (
    <Button
      type="button"
      variant="text"
      onPress={onSwitchToLogin}
      className="mt-1.5 h-auto px-0 text-[12px] text-primary hover:underline"
    >
      去登录
    </Button>
  );
}
```

具体 className 以实现时对照现有按钮风格微调为准，不追求逐字匹配。

## 测试

- 后端：
  - `SendCode` service 单测：邮箱已注册时返回 `ErrEmailTaken`（且发生在冷却/限流检查通过之后、生成验证码之前，不消耗验证码额度）。
  - `SendCode` handler 测试：命中 `ErrEmailTaken` 时返回 HTTP 409 + `error_code: "AUTH_EMAIL_TAKEN"`。
- 前端：
  - `use-captcha-token.test.ts`：`onToken` 抛出非限流错误时触发 `onError`（携带 message/errorCode）且不重拉新挑战；不传 `onError` 时行为与现状一致（不报错、只关闭弹层）。
  - `use-register-form.test.ts` / `register-view.test.tsx`：邮箱已注册场景下展示提示文案 + 「去登录」按钮，点击后调用 `onSwitchToLogin`。

## 不在范围内

- `Register` 接口的响应格式（仍是 400 + 通用兜底，不加 409/`error_code`，不加「去登录」按钮）。
- 改邮箱 / 设初始密码 / 邮箱找回密码三处调用方，不接入 `onError`，行为不变。
