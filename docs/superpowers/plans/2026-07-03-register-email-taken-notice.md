# 注册发码环节提示「邮箱已注册」 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 注册流程中，用户完成滑块验证码后，若邮箱已注册，立刻提示「该邮箱已被注册」并给出「去登录」入口，而不是等到最后提交注册才报错。

**Architecture:** 后端 `SendCode` 在消费图形验证码票据后新增邮箱查重，命中时用 HTTP 409 + `error_code: "AUTH_EMAIL_TAKEN"` 区分于其它 400 错误；前端共享 hook `use-captcha-token.tsx` 拆分“滑块验证失败”与“发码业务请求失败”两条错误路径，后者新增 `onError` 回调对外暴露 message/errorCode；注册表单据此设置 `apiError` + `emailTaken`，UI 层追加「去登录」按钮。

**Tech Stack:** Go + Gin + gomock（后端），React + TypeScript + Vitest + Testing Library（前端），pnpm workspaces monorepo。

## Global Constraints

- 后端仓库路径：`/Users/vpt/Documents/Codes/blog/blog-backend`（独立 git 仓库，与本仓库分开提交）。
- 前端仓库路径：`/Users/vpt/Documents/Codes/blog/blog-frontend`（当前工作目录）。
- 后端测试命令：`go test ./internal/service/auth/... -run <TestName> -v`、`go test ./internal/handler/auth/... -run <TestName> -v`；改动后跑 `go test ./internal/service/auth/...` 与 `go test ./internal/handler/auth/...` 全量。
- 前端测试命令：`pnpm --filter web test <相对 apps/web 的路径>`（例如 `pnpm --filter web test hooks/use-captcha-token.test.tsx`）。
- 前端 commit 前必须能通过 `pnpm -r check-types` 与 `pnpm -r lint`（已确认当前仓库这两项在写计划前是绿的）。
- commit message 格式：`<type>(<scope>): <中文主题>`，`type` 限 `feat/fix/refactor/test/chore/perf/docs/ci/style/build`，主题含中文、≤50 字、不以句号结尾（两个仓库的 `commit-msg` 钩子都强制校验，格式一致）。
- `Register` 接口现有的邮箱查重与响应格式（400 + 通用兜底）保持不变，不在本次改动范围。
- 改邮箱 / 设初始密码 / 邮箱找回密码三处 `useCaptchaToken` 调用方不接入 `onError`，行为必须与改动前完全一致。

---

## 文件结构总览

**后端（blog-backend）：**

- 改：`internal/service/auth/auth.go`（`SendCode` 加邮箱查重）
- 改：`internal/service/auth/auth_test.go`（更新 `TestAuthService_SendCode_Success`，新增邮箱已注册用例）
- 改：`pkg/response/response.go`（新增 `CodeAuthEmailTaken` 常量）
- 改：`internal/handler/auth/auth.go`（`SendCode` handler 新增 409 分支）
- 改：`internal/handler/auth/auth_test.go`（新增 409 分支用例）

**前端（blog-frontend）：**

- 改：`apps/web/hooks/use-captcha-token.tsx`（拆分 `handleVerify`，新增 `onError`/`errorCode` 透传）
- 改：`apps/web/hooks/use-captcha-token.test.tsx`（新增 `onError` 触发用例）
- 改：`apps/web/hooks/use-register-form.tsx`（新增 `emailTaken` 状态，接入 `onError`）
- 改：`apps/web/hooks/use-register-form.test.tsx`（新增邮箱已注册场景用例）
- 改：`apps/web/components/auth/register-view.tsx`（新增「去登录」按钮）
- 改：`apps/web/components/auth/register-view.test.tsx`（新增邮箱已注册场景用例）

---

### Task 1: 后端 — `SendCode` service 增加邮箱查重

**Files:**

- Modify: `/Users/vpt/Documents/Codes/blog/blog-backend/internal/service/auth/auth.go:122-166`
- Test: `/Users/vpt/Documents/Codes/blog/blog-backend/internal/service/auth/auth_test.go:87-101`（改）+ 新增用例

**Interfaces:**

- Consumes：现成的 `s.repo.ExistsByEmail(email string) (bool, error)`（`internal/repository/user/user.go:114`）、现成的 `ErrEmailTaken = errors.New("该邮箱已被注册")`（`auth.go:28`）。
- Produces：`SendCode` 在邮箱已注册时返回 `ErrEmailTaken`（后续 Task 2 的 handler 靠 `errors.Is(err, ErrEmailTaken)` 识别）。

- [ ] **Step 1: 写失败测试**

在 `internal/service/auth/auth_test.go` 中，把现有 `TestAuthService_SendCode_Success` 从：

```go
func TestAuthService_SendCode_Success(t *testing.T) {
	svc, _, rdb, mr, mailer, captchaConsumer := setupService(t)
	defer mr.Close()

	err := svc.SendCode("user@example.com", "127.0.0.1", "captcha-token")
	require.NoError(t, err)
```

改为（补上 `ExistsByEmail` 期望，否则加了查重之后这个测试会因 mock 收到未预期调用而失败）：

```go
func TestAuthService_SendCode_Success(t *testing.T) {
	svc, repo, rdb, mr, mailer, captchaConsumer := setupService(t)
	defer mr.Close()
	repo.EXPECT().ExistsByEmail("user@example.com").Return(false, nil)

	err := svc.SendCode("user@example.com", "127.0.0.1", "captcha-token")
	require.NoError(t, err)
```

其余断言不变。然后在文件末尾（`TestAuthService_SendCode_InvalidCaptchaToken` 之后）新增：

```go
func TestAuthService_SendCode_EmailAlreadyRegistered(t *testing.T) {
	svc, repo, rdb, mr, mailer, _ := setupService(t)
	defer mr.Close()
	repo.EXPECT().ExistsByEmail("taken@example.com").Return(true, nil)

	err := svc.SendCode("taken@example.com", "127.0.0.1", "captcha-token")

	require.ErrorIs(t, err, authservice.ErrEmailTaken)
	assert.Empty(t, mailer.sentTo)
	exists, redisErr := rdb.Exists(context.Background(), "email:code:taken@example.com").Result()
	require.NoError(t, redisErr)
	assert.Equal(t, int64(0), exists)
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/vpt/Documents/Codes/blog/blog-backend && go test ./internal/service/auth/... -run 'TestAuthService_SendCode' -v`

Expected: `TestAuthService_SendCode_Success` 因 `missing call(s) to *MockUserRepository.ExistsByEmail` 或类似 gomock 报错失败（因为实现还没调用它，属于「预期调用但未发生」——若 gomock 未把它标为失败而是忽略，说明当前是"多余的 EXPECT 未被消费"报错，同样视为预期中的失败）；`TestAuthService_SendCode_EmailAlreadyRegistered` 因 `err` 为 `nil`（`require.ErrorIs` 失败）而 FAIL。

- [ ] **Step 3: 实现**

编辑 `internal/service/auth/auth.go`，在「消费图形验证码票据」之后、「10分钟内发送次数检查」之前插入邮箱查重：

```go
	// 发送邮件验证码前必须消费一次性图形验证码票据，防止绕过前端直接刷邮件接口
	if err := s.captchaConsumer.ConsumeRegistrationToken(captchaToken, ip); err != nil {
		return err
	}

	// 邮箱已注册无需再发码，尽早拦截，避免用户走完滑块+等邮件才在提交时被拒
	taken, err := s.repo.ExistsByEmail(to)
	if err != nil {
		return err
	}
	if taken {
		return ErrEmailTaken
	}

	// 10分钟内发送次数检查（上限2次），首次 Incr 后立即设过期时间，避免 key 永久存在
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/vpt/Documents/Codes/blog/blog-backend && go test ./internal/service/auth/... -run 'TestAuthService_SendCode' -v`

Expected: `PASS`（`TestAuthService_SendCode_Success`、`TestAuthService_SendCode_CooldownBlocks`、`TestAuthService_SendCode_InvalidCaptchaToken`、`TestAuthService_SendCode_EmailAlreadyRegistered` 全部通过）。

再跑全包确认没有牵连其它用例：

Run: `cd /Users/vpt/Documents/Codes/blog/blog-backend && go test ./internal/service/auth/...`

Expected: `ok`

- [ ] **Step 5: 提交**

```bash
cd /Users/vpt/Documents/Codes/blog/blog-backend
git add internal/service/auth/auth.go internal/service/auth/auth_test.go
git commit -m "fix(auth): 发码前校验邮箱是否已注册"
```

---

### Task 2: 后端 — `SendCode` handler 用 409 区分「邮箱已注册」

**Files:**

- Modify: `/Users/vpt/Documents/Codes/blog/blog-backend/pkg/response/response.go`
- Modify: `/Users/vpt/Documents/Codes/blog/blog-backend/internal/handler/auth/auth.go:35-55`
- Test: `/Users/vpt/Documents/Codes/blog/blog-backend/internal/handler/auth/auth_test.go`

**Interfaces:**

- Consumes：Task 1 产出的 `authservice.ErrEmailTaken`；现成的 `response.Conflict(c *gin.Context, errorCode string, message string)`（`pkg/response/response.go`，HTTP 409）。
- Produces：`POST /auth/send-code` 命中邮箱已注册时返回 `HTTP 409` + `{code: 409, error_code: "AUTH_EMAIL_TAKEN", message: "该邮箱已被注册"}`，供前端 Task 3/4 消费。

- [ ] **Step 1: 写失败测试**

在 `internal/handler/auth/auth_test.go` 的 `TestAuthHandler_SendCode_TooManyRequests` 之后新增：

```go
func TestAuthHandler_SendCode_EmailAlreadyRegistered(t *testing.T) {
	r := newTestRouter(&stubAuthService{sendCodeErr: authservice.ErrEmailTaken})
	body, _ := json.Marshal(map[string]string{
		"email":         "taken@example.com",
		"captcha_token": "captcha-token",
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/auth/send-code", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
	var resp response.Response
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, http.StatusConflict, resp.Code)
	assert.Equal(t, response.CodeAuthEmailTaken, resp.ErrorCode)
	assert.Equal(t, "该邮箱已被注册", resp.Message)
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/vpt/Documents/Codes/blog/blog-backend && go test ./internal/handler/auth/... -run 'TestAuthHandler_SendCode_EmailAlreadyRegistered' -v`

Expected: 编译失败（`response.CodeAuthEmailTaken` 不存在）或运行失败（`w.Code` 为 200 而非 409）——先加 Step 3 的常量使其能编译，再确认断言失败。

- [ ] **Step 3: 实现**

在 `pkg/response/response.go` 的 `ErrorCode` 常量组末尾新增一行：

```go
const (
	CodeContentRiskRejected         = "CONTENT_RISK_REJECTED"
	CodeImageReviewUnavailable      = "CONTENT_IMAGE_REVIEW_UNAVAILABLE"
	CodeContentAlreadyDeleted       = "CONTENT_ALREADY_DELETED"
	CodeContentPendingNoInteraction = "CONTENT_PENDING_NO_INTERACTION"
	CodeModerationReviewConflict    = "MODERATION_REVIEW_CONFLICT"
	CodeModerationRulesetConflict   = "MODERATION_RULESET_CONFLICT"
	CodeModerationRuleLimit         = "MODERATION_RULE_LIMIT"
	CodeModerationIndexMemoryLimit  = "MODERATION_INDEX_MEMORY_LIMIT"
	CodeModerationImportInvalid     = "MODERATION_IMPORT_INVALID"
	CodeAuthEmailTaken              = "AUTH_EMAIL_TAKEN"
)
```

在 `internal/handler/auth/auth.go` 的 `SendCode` handler 里，在限流分支之后、通用兜底之前插入：

```go
	if err := h.svc.SendCode(req.Email, c.ClientIP(), req.CaptchaToken); err != nil {
		// 频率超限（冷却/10分钟/日限）映射到 429，其余业务错误映射到 400
		if isTooManyRequests(err) {
			response.TooManyRequests(c, err.Error(), 0)
			return
		}
		// 邮箱已注册单独映射到 409 + error_code，供前端区分是否要展示「去登录」
		if errors.Is(err, authservice.ErrEmailTaken) {
			response.Conflict(c, response.CodeAuthEmailTaken, err.Error())
			return
		}
		response.Fail(c, response.CodeBadRequest, err.Error())
		return
	}
```

（`errors` 与 `authservice` 已在文件顶部导入，无需新增 import。）

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/vpt/Documents/Codes/blog/blog-backend && go test ./internal/handler/auth/... -v`

Expected: 全部 `PASS`，含新增的 `TestAuthHandler_SendCode_EmailAlreadyRegistered`。

- [ ] **Step 5: 提交**

```bash
cd /Users/vpt/Documents/Codes/blog/blog-backend
git add pkg/response/response.go internal/handler/auth/auth.go internal/handler/auth/auth_test.go
git commit -m "fix(auth): 发码接口用 409 区分邮箱已注册"
```

（可选：若想让 Swagger 文档同步反映新响应码，运行 `make swag`；不影响本功能测试，不阻塞本任务。）

---

### Task 3: 前端 — `use-captcha-token.tsx` 拆分错误路径并新增 `onError`

**Files:**

- Modify: `apps/web/hooks/use-captcha-token.tsx`
- Test: `apps/web/hooks/use-captcha-token.test.tsx`

**Interfaces:**

- Consumes：无新外部依赖。
- Produces：`UseCaptchaTokenOptions.onError?: (message: string, errorCode: string | null) => void`；当 `onToken` 抛出非限流错误时调用，携带从错误对象上鸭子类型探测到的 `errorCode` 属性（后续 Task 4 用它判断 `"AUTH_EMAIL_TAKEN"`）。`onError` 不传时行为等价于现状（关闭弹层，不提示）。

- [ ] **Step 1: 写失败测试**

在 `apps/web/hooks/use-captcha-token.test.tsx` 的 `"handleVerify 其它失败时重拉新挑战且保持打开"` 用例之后新增：

```tsx
it("handleVerify 中 onToken 抛出非限流业务错误时关闭弹层并调用 onError，不重拉挑战", async () => {
  class BusinessError extends Error {
    errorCode = "AUTH_EMAIL_TAKEN";
  }
  const onError = vi.fn();
  const onToken = vi.fn().mockRejectedValue(new BusinessError("该邮箱已被注册"));
  vi.spyOn(global, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ challenge_id: "c1", tile_x: 10, tile_y: 20 })),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ captcha_token: "tok123" })));
  const { result } = renderHook(() => useCaptchaToken({ onToken, onError }));

  await act(async () => {
    await result.current.openCaptcha();
  });
  await act(async () => {
    await result.current.handleVerify(15);
  });

  expect(onError).toHaveBeenCalledWith("该邮箱已被注册", "AUTH_EMAIL_TAKEN");
  expect(result.current.captchaOpen).toBe(false);
  // 不应重拉新挑战：仅 challenge + verify 两次请求
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test hooks/use-captcha-token.test.tsx`

Expected: 新用例 FAIL——`onError` 未被调用（因为 `useCaptchaToken` 还不接受 `onError` 参数，TS 也会报 `onError` 不是合法属性，但 vitest 仍会按 JS 运行；若类型检查单独跑会报错，属预期）。

- [ ] **Step 3: 实现**

编辑 `apps/web/hooks/use-captcha-token.tsx`：

1. `isRateLimited` 函数之后新增：

```ts
/**
 * 从 onToken 抛出的业务错误中提取 error_code（若存在）。
 * onToken 由各调用方自行实现（RegisterApiError / ApiClientError 等类型不一），
 * 故用鸭子类型探测而非依赖具体错误类，与 isRateLimited 的做法一致。
 */
function extractErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) {
    return null;
  }
  const { errorCode } = err as { errorCode?: unknown };
  return typeof errorCode === "string" ? errorCode : null;
}
```

2. `UseCaptchaTokenOptions` 接口新增字段：

```ts
export interface UseCaptchaTokenOptions {
  /** 拿到一次性 captcha_token 后的业务回调（如发码 / 找回密码） */
  onToken: (captchaToken: string) => Promise<void>;
  /** 命中限流（429）时的提示回调 */
  onRateLimited?: (message: string) => void;
  /** onToken 抛出非限流业务错误时的提示回调（如「邮箱已注册」），errorCode 供调用方细分场景 */
  onError?: (message: string, errorCode: string | null) => void;
}
```

3. `useCaptchaToken` 函数体开头解构新增 `onError`：

```ts
export function useCaptchaToken(opts: UseCaptchaTokenOptions): UseCaptchaTokenResult {
  const { onToken, onRateLimited, onError } = opts;
```

4. 把 `handleVerify` 整个函数替换为：

```ts
const handleVerify = useCallback(
  async (x: number) => {
    if (!captchaChallenge) {
      return;
    }
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
      // 业务发码请求失败，不是滑块的问题：重拉验证码没有意义，直接关闭并把错误暴露给调用方
      closeCaptcha();
      if (isRateLimited(err)) {
        onRateLimited?.(err instanceof Error ? err.message : "发送过于频繁");
      } else {
        onError?.(err instanceof Error ? err.message : "操作失败", extractErrorCode(err));
      }
    } finally {
      setCaptchaLoading(false);
    }
  },
  [captchaChallenge, closeCaptcha, fetchChallenge, onToken, onRateLimited, onError],
);
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test hooks/use-captcha-token.test.tsx`

Expected: 全部用例 `PASS`（含原有 5 个 + 新增 1 个，共 6 个）。

- [ ] **Step 5: 提交**

```bash
git add apps/web/hooks/use-captcha-token.tsx apps/web/hooks/use-captcha-token.test.tsx
git commit -m "fix(auth): 发码业务错误不再被验证码弹层静默吞掉"
```

---

### Task 4: 前端 — `use-register-form.tsx` 接入 `onError`，新增 `emailTaken` 状态

**Files:**

- Modify: `apps/web/hooks/use-register-form.tsx`
- Test: `apps/web/hooks/use-register-form.test.tsx`

**Interfaces:**

- Consumes：Task 3 产出的 `useCaptchaToken({ onError })`。
- Produces：`useRegisterForm` 返回值新增 `emailTaken: boolean`（后续 Task 5 的 `RegisterView` 用它决定是否渲染「去登录」按钮）。

- [ ] **Step 1: 写失败测试**

在 `apps/web/hooks/use-register-form.test.tsx` 的 `"successful captcha verify sends email code and starts 60 second countdown"` 用例之后新增：

```tsx
it("captcha verify with email already registered sets apiError and emailTaken", async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(mockApiResponse(CHALLENGE))
    .mockResolvedValueOnce(mockApiResponse({ captcha_token: "captcha-token" }))
    .mockResolvedValueOnce({
      json: async () => ({
        code: 409,
        error_code: "AUTH_EMAIL_TAKEN",
        message: "该邮箱已被注册",
        data: null,
      }),
    } as Response);

  const { result } = renderHook(() => useRegisterForm({ onSuccess }));

  act(() => {
    result.current.setEmail("taken@example.com");
  });

  await act(async () => {
    await result.current.openCaptcha();
  });

  await act(async () => {
    await result.current.handleCaptchaVerify(162);
  });

  expect(result.current.apiError).toBe("该邮箱已被注册");
  expect(result.current.emailTaken).toBe(true);
  expect(result.current.captchaOpen).toBe(false);
  expect(result.current.codeSent).toBe(false);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test hooks/use-register-form.test.tsx`

Expected: 新用例 FAIL——`result.current.emailTaken` 为 `undefined`（尚未实现该字段）。

- [ ] **Step 3: 实现**

编辑 `apps/web/hooks/use-register-form.tsx`：

1. `ApiResponse<T>` 接口新增字段：

```ts
interface ApiResponse<T> {
  code: number;
  error_code?: string;
  message: string;
  data?: T;
}
```

2. `RegisterApiError` 类新增 `errorCode` 字段：

```ts
class RegisterApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly errorCode: string | null = null,
  ) {
    super(message);
    this.name = "RegisterApiError";
  }
}
```

3. `requestRegisterApi` 透传 `error_code`：

```ts
async function requestRegisterApi<T>(url: string, init: FetchInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (json.code !== 0) {
    throw new RegisterApiError(json.message || "请求失败", json.code, json.error_code ?? null);
  }
  return json.data as T;
}
```

4. `useRegisterForm` 函数体内，`apiError` state 声明之后新增：

```ts
const [emailTaken, setEmailTaken] = useState(false);
```

5. `useCaptchaToken` 调用新增 `onError`：

```ts
const captcha = useCaptchaToken({
  onToken: sendEmailCode,
  onRateLimited: (message) => addToast(message, "error"),
  onError: (message, errorCode) => {
    setApiError(message);
    setEmailTaken(errorCode === "AUTH_EMAIL_TAKEN");
  },
});
```

6. `openCaptcha` 与 `submitRegistration` 开始处各加一行重置，避免上一次「邮箱已注册」的状态残留到下一次尝试：

```ts
  const openCaptcha = useCallback(async () => {
    if (!isValidEmail(email)) {
      return;
    }
    setLoading(true);
    setApiError(null);
    setEmailTaken(false);
    try {
```

```ts
  const submitRegistration = useCallback(async () => {
    setSubmitAttempted(true);
    setApiError(null);
    setEmailTaken(false);

    if (!isValidEmail(email) || validatePassword(password) !== null || !code.trim()) {
```

7. 返回对象新增 `emailTaken`（放在 `apiError` 旁边）：

```ts
    apiError,
    emailTaken,
    loading,
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test hooks/use-register-form.test.tsx`

Expected: 全部用例 `PASS`。

- [ ] **Step 5: 提交**

```bash
git add apps/web/hooks/use-register-form.tsx apps/web/hooks/use-register-form.test.tsx
git commit -m "feat(auth): 注册表单感知邮箱已注册状态"
```

---

### Task 5: 前端 — `register-view.tsx` 展示「去登录」按钮

**Files:**

- Modify: `apps/web/components/auth/register-view.tsx`
- Test: `apps/web/components/auth/register-view.test.tsx`

**Interfaces:**

- Consumes：Task 4 产出的 `useRegisterForm().emailTaken: boolean`；组件已有的 `onSwitchToLogin: () => void` prop。
- Produces：无新对外接口，纯 UI 展示。

- [ ] **Step 1: 写失败测试**

在 `apps/web/components/auth/register-view.test.tsx` 的 `"send-code 返回 429 时关闭验证码弹层并 toast 通知，不重试拼图"` 用例之后新增：

```tsx
it("send-code 返回邮箱已注册时显示提示与去登录按钮，点击调用 onSwitchToLogin", async () => {
  const user = userEvent.setup();
  vi.mocked(global.fetch)
    .mockResolvedValueOnce(mockProviders())
    .mockResolvedValueOnce({
      json: async () => ({
        code: 0,
        message: "ok",
        data: {
          challenge_id: "c1",
          master_image: "data:image/jpeg;base64,m",
          tile_image: "data:image/png;base64,t",
          tile_x: 10,
          tile_y: 80,
          tile_width: 60,
          tile_height: 60,
          image_width: 300,
          image_height: 220,
        },
      }),
    } as Response)
    .mockResolvedValueOnce({
      json: async () => ({ code: 0, message: "ok", data: { captcha_token: "tok" } }),
    } as Response)
    .mockResolvedValueOnce({
      json: async () => ({
        code: 409,
        error_code: "AUTH_EMAIL_TAKEN",
        message: "该邮箱已被注册",
        data: null,
      }),
    } as Response);

  render(<RegisterView onSwitchToLogin={mockSwitch} onSuccess={mockSuccess} />);
  await user.type(screen.getByPlaceholderText("邮箱地址"), "taken@example.com");
  await user.click(screen.getByRole("button", { name: "获取验证码" }));

  const track = await screen.findByTestId("captcha-track");
  Object.defineProperty(track, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      right: 300,
      bottom: 52,
      width: 300,
      height: 52,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    configurable: true,
  });
  fireEvent.pointerDown(track, { clientX: 10, pointerId: 1 });
  fireEvent.pointerMove(track, { clientX: 162 });
  fireEvent.pointerUp(track, { clientX: 162, pointerId: 1 });

  await waitFor(() => {
    expect(screen.getByText("该邮箱已被注册")).toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: "去登录" }));
  expect(mockSwitch).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter web test components/auth/register-view.test.tsx`

Expected: 新用例 FAIL——找不到文本「该邮箱已被注册」或找不到名为「去登录」的按钮。

- [ ] **Step 3: 实现**

编辑 `apps/web/components/auth/register-view.tsx`：

1. 从 `useRegisterForm` 解构结果中新增 `emailTaken`：

```tsx
    apiError,
    emailTaken,
    loading,
```

2. 在现有 `apiError` 提示段落之后追加按钮：

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
      className="mt-1.5 text-[12px] text-primary hover:underline"
    >
      去登录
    </Button>
  );
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter web test components/auth/register-view.test.tsx`

Expected: 全部用例 `PASS`。

再跑一次前端全量类型检查与相关包测试，确认没有牵连其它文件：

Run: `pnpm -r check-types && pnpm --filter web test`

Expected: 类型检查通过；`apps/web` 全部测试 `PASS`。

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/auth/register-view.tsx apps/web/components/auth/register-view.test.tsx
git commit -m "feat(auth): 注册页邮箱已注册时展示去登录入口"
```

---

## 收尾

- 后端两个 commit 在 `blog-backend` 仓库；前端三个 commit 在 `blog-frontend` 仓库——两边各自独立提交，不需要也不能合并到同一个 commit。
- 若本地有部署/预览环境，建议按 `writing-tests`/`run` 类 skill 简单跑一遍注册页手动验证：邮箱填一个已存在账号的邮箱 → 完成滑块 → 应看到「该邮箱已被注册」+「去登录」按钮，点击后应切回登录表单。
