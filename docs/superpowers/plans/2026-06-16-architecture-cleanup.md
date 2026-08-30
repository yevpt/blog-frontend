# Architecture Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce web-side architecture debt by moving request/state logic out of large UI components, unifying client request helpers, and adding focused tests for the changed behavior.

**Architecture:** Keep the existing monorepo shape and public APIs. Add small web-local request helpers/hooks first, then migrate one feature area at a time without changing visible UX. Prefer extracting pure helpers and hooks over broad rewrites.

**Tech Stack:** React 19, TypeScript, Next.js App Router, TailwindCSS, Zustand, Vitest, Testing Library, `@repo/ui`, `@repo/api`, `@repo/icons`.

---

## Ground Rules

- Do not edit `.next`, `node_modules`, generated icon sprite files, or unrelated worktree files.
- Follow `AGENTS.md`: no `any`, reuse `@repo/ui`, `@repo/api`, `@repo/icons`, add tests for changed hooks/components/pages.
- Use the relevant repo skills before implementation:
  - UI/TSX work: `.agents/skills/building-ui/SKILL.md`
  - API/request work: `.agents/skills/extending-api/SKILL.md`
  - tests: `.agents/skills/writing-tests/SKILL.md`
  - commits: `.agents/skills/git-commit/SKILL.md`
- Keep each task behavior-preserving unless the task explicitly fixes a bug.
- After every task, run the listed targeted test command before moving on.

## File Map

- Create `apps/web/lib/client-fetch.ts`: browser-side JSON/form helpers for `/api/**` routes.
- Create `apps/web/lib/query.ts`: tiny query-string builder shared by hooks.
- Create/modify feature hooks:
  - `apps/web/hooks/use-article-list.ts`
  - `apps/web/hooks/use-moment-list.ts`
  - `apps/web/hooks/use-profile-editor.ts`
  - existing comment/guestbook hooks as needed
- Split large components:
  - `apps/web/components/snippets/snippets-list.tsx`
  - `apps/web/components/articles/article-section.tsx`
  - `apps/web/components/auth/register-view.tsx`
  - `apps/web/app/users/[id]/_components/profile-tab/profile-tab.tsx`
  - `apps/web/components/comments/comment-section.tsx`
- Add tests beside changed hooks/components.

---

## Task 1: Add Shared Browser Request Helpers

**Files:**

- Create: `apps/web/lib/client-fetch.ts`
- Create: `apps/web/lib/query.ts`
- Test: `apps/web/lib/client-fetch.test.ts`
- Test: `apps/web/lib/query.test.ts`

- [ ] Step 1: Create tests for query building.

Test these cases in `apps/web/lib/query.test.ts`:

- omits `undefined`, `null`, and empty string values
- keeps `0` and `false`
- returns `""` when no values are set
- returns deterministic query strings for page/page_size/category_id

- [ ] Step 2: Implement `buildQuery`.

Expected API:

```ts
export type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}
```

- [ ] Step 3: Create tests for client fetch.

Test these behaviors in `apps/web/lib/client-fetch.test.ts`:

- `apiJson<T>` returns parsed JSON on `2xx`
- `apiJson<T>` throws an `ApiClientError` with status/message on non-OK response
- `apiJson<T>` supports `AbortSignal`
- `apiForm<T>` sends `FormData` without forcing `Content-Type`

- [ ] Step 4: Implement `client-fetch.ts`.

Required exports:

- `ApiClientError`
- `apiJson<T>(path: string, init?: RequestInit): Promise<T>`
- `apiForm<T>(path: string, formData: FormData, init?: Omit<RequestInit, "body">): Promise<T>`

Important behavior:

- If backend route returns `{ error: "..." }`, use that as the thrown message.
- If response body is empty, return `undefined as T`.
- Do not import `@repo/api` here; this helper is only for browser `/api/**` routes.

- [ ] Step 5: Run targeted tests.

Run:

```bash
pnpm --filter web test:run apps/web/lib/query.test.ts apps/web/lib/client-fetch.test.ts
```

Expected: both test files pass.

---

## Task 2: Move Article List State/Requests Out Of `ArticleSection`

**Files:**

- Create: `apps/web/hooks/use-article-list.ts`
- Test: `apps/web/hooks/use-article-list.test.ts`
- Modify: `apps/web/components/articles/article-section.tsx`
- Test: `apps/web/components/articles/article-section.test.tsx`

- [ ] Step 1: Write hook tests for article pagination and likes.

Cover:

- initializes from `initialPage`
- `changeCategory(id)` resets to page 1 and requests `/api/articles?page=1&category_id=ID`
- `changePage(page)` requests current category
- aborts/replaces in-flight list request when a new list request starts
- `toggleLike(article)` opens login modal when user is missing
- successful like updates only the matching article item

- [ ] Step 2: Implement `useArticleList`.

Suggested return shape:

```ts
{
  currentCategoryId,
  currentPage,
  pageData,
  isLoading,
  fetchError,
  pendingLikeIds,
  changeCategory,
  changePage,
  toggleLike,
  refreshForSessionChange,
  setPageData,
}
```

Implementation notes:

- Use `apiJson<ArticlePageResp>` and `buildQuery`.
- Store pending like ids as `Set<number>` internally.
- Expose `pendingLikeIds` as `ReadonlySet<number>` so render checks are O(1).
- Keep the existing silent refresh behavior on login/logout.

- [ ] Step 3: Refactor `ArticleSection`.

Remove from `ArticleSection`:

- raw `fetch`
- `AbortController` state
- `pendingLikeIds` array logic
- page/category request logic

Keep in `ArticleSection`:

- layout
- header/search UI
- comment modal state
- rendering `ArticleCard` and pagination

- [ ] Step 4: Run targeted tests.

Run:

```bash
pnpm --filter web test:run apps/web/hooks/use-article-list.test.ts apps/web/components/articles/article-section.test.tsx
```

Expected: tests pass.

---

## Task 3: Fix And Extract Snippets/Moments List State

**Files:**

- Create: `apps/web/hooks/use-moment-list.ts`
- Test: `apps/web/hooks/use-moment-list.test.ts`
- Modify: `apps/web/components/snippets/snippets-list.tsx`
- Test: `apps/web/components/snippets/snippets-list.test.tsx`

- [ ] Step 1: Write tests that expose the current query bug.

Cover:

- when active tab is `friends`, refresh after session change requests `role_id`
- when active tab is `owner`, refresh requests `user_id`
- when active tab is `all`, refresh requests neither `user_id` nor `role_id`
- `loadMore` appends items and sets end state
- failed load sets `fetchError` without dropping existing items

- [ ] Step 2: Implement `useMomentList`.

Suggested query type:

```ts
export type MomentTab = "all" | "owner" | "friends";
export type MomentSort = "latest" | "popular";

export interface MomentListQuery {
  tab: MomentTab;
  page: number;
  pageSize: number;
  ownerUserId?: number;
  friendRoleId?: number;
}
```

Hook responsibilities:

- hold `activeTab`, `activeSort`, `pageData`, `moments`, loading flags, end state, fetch error
- build `/api/moments` query from the full active tab state
- refresh on user/session change using the same active tab query
- toggle like with `Set<number>` pending ids
- expose `sortedMoments`

- [ ] Step 3: Stabilize infinite-scroll observer.

In `SnippetsList`, keep a stable observer effect:

- put latest `loadMore` in a ref, or make observer callback read from refs
- avoid disconnect/reconnect on every page/loading state change
- keep root margin at `200px`

- [ ] Step 4: Keep pure masonry helpers in a small file if needed.

If `snippets-list.tsx` remains over 250 lines after the hook extraction, create:

- `apps/web/components/snippets/snippet-masonry.ts`

Move pure helpers there:

- `getSnippetColumnCount`
- `estimateHeight`
- `distributeToColumns`

Add or update tests for these pure helpers.

- [ ] Step 5: Run targeted tests.

Run:

```bash
pnpm --filter web test:run apps/web/hooks/use-moment-list.test.ts apps/web/components/snippets/snippets-list.test.tsx
```

Expected: tests pass, including the `friends` refresh case.

---

## Task 4: Split Registration View Into Hook And Small Components

**Files:**

- Create: `apps/web/components/auth/register-captcha.tsx`
- Create: `apps/web/hooks/use-register-form.ts`
- Test: `apps/web/hooks/use-register-form.test.ts`
- Modify: `apps/web/components/auth/register-view.tsx`
- Test: `apps/web/components/auth/register-view.test.tsx`

- [ ] Step 1: Move validation helpers into the hook module.

Required exported helpers:

- `isValidEmail(value: string): boolean`
- `validatePassword(value: string): string | null`

Keep current Chinese error messages unchanged.

- [ ] Step 2: Write hook tests.

Cover:

- invalid email blocks captcha open
- password shorter than 8 chars returns the existing error
- successful captcha challenge opens modal and initializes `captchaX`
- successful captcha verify sends email code and starts 60 second countdown
- registration success calls `onSwitchToLogin`
- object URL for avatar preview is revoked when replaced/removed

- [ ] Step 3: Create `RegisterCaptcha`.

Move from `register-view.tsx`:

- `CaptchaSlider`
- captcha modal rendering
- puzzle image rendering

Props should be explicit:

- `challenge`
- `captchaX`
- `captchaOpen`
- `captchaLoading`
- `onOpenChange`
- `onCaptchaXChange`
- `onVerify`
- `onClose`

- [ ] Step 4: Refactor `RegisterView`.

After extraction, `RegisterView` should mostly render:

- title
- email/code/password/nickname/avatar fields
- submit button
- OAuth grid
- `RegisterCaptcha`

It should not define `requestJSON`, `ApiError`, or captcha request logic.

- [ ] Step 5: Replace raw inputs only if it does not create churn.

Preferred:

- Use `Input` from `@repo/ui` for text/email/password fields.

Acceptable for this task:

- Keep existing native inputs if replacing them breaks existing tests or styling. Do not mix in a partial UI rewrite that changes UX.

- [ ] Step 6: Run targeted tests.

Run:

```bash
pnpm --filter web test:run apps/web/hooks/use-register-form.test.ts apps/web/components/auth/register-view.test.tsx
```

Expected: tests pass and visible registration behavior is unchanged.

---

## Task 5: Extract Profile Editing State And Static Config

**Files:**

- Create: `apps/web/app/users/[id]/_components/profile-tab/profile-config.ts`
- Create: `apps/web/app/users/[id]/_components/profile-tab/profile-format.ts`
- Create: `apps/web/hooks/use-profile-editor.ts`
- Test: `apps/web/hooks/use-profile-editor.test.ts`
- Modify: `apps/web/app/users/[id]/_components/profile-tab/profile-tab.tsx`
- Modify: `apps/web/app/users/[id]/_components/user-profile-page.tsx`

- [ ] Step 1: Extract pure profile format helpers.

Move these from `profile-tab.tsx` into `profile-format.ts`:

- `getZodiac`
- `getAge`
- `formatRegisterAt`

Add tests for:

- birthday age before/after current birthday
- zodiac boundary examples
- ISO date formatting fallback

- [ ] Step 2: Extract static social config and validators.

Move into `profile-config.ts`:

- `SOCIAL_PLATFORMS`
- gender options
- social field list
- validators for nickname, mark, description, URL, QQ, WeChat, phone

Keep current labels and messages unchanged.

- [ ] Step 3: Write `use-profile-editor` tests.

Cover:

- saving `nickname` PATCHes `/api/users/me/profile` and updates local profile
- saving `mark`/`description` PATCHes profile endpoint with `null` for empty values
- saving `gender`/`birthday` PATCHes `/api/users/me/meta`
- saving `site` PATCHes profile endpoint
- saving social link PATCHes `/api/users/me/social/{platform}` and updates `social_links`
- avatar upload sends FormData to `/api/users/me/avatar` and updates avatar URL

- [ ] Step 4: Implement `useProfileEditor`.

Suggested return shape:

```ts
{
  profile,
  isOwner,
  isEditMode,
  isAnyFieldEditing,
  setIsAnyFieldEditing,
  toggleEditMode,
  saveNickname,
  saveField,
  changeAvatar,
}
```

Use `apiJson` and `apiForm`.

- [ ] Step 5: Refactor `UserProfilePage`.

Remove direct raw fetch helpers from `user-profile-page.tsx`.
Keep page composition only:

- header
- tabs card
- profile editor hook wiring

- [ ] Step 6: Refactor `ProfileTab`.

Use extracted config and format helpers.
If the file is still over 250 lines, split read-only rendering:

- Create `apps/web/app/users/[id]/_components/profile-tab/profile-read-view.tsx`
- Keep edit rows in `profile-tab.tsx`

- [ ] Step 7: Run targeted tests.

Run:

```bash
pnpm --filter web test:run apps/web/hooks/use-profile-editor.test.ts
```

Then run any existing user profile related tests if present.

---

## Task 6: Reduce Comment Section Responsibilities

**Files:**

- Create: `apps/web/hooks/use-comment-section-state.ts`
- Test: `apps/web/hooks/use-comment-section-state.test.ts`
- Modify: `apps/web/components/comments/comment-section.tsx`
- Modify if needed: `apps/web/components/comments/comment-list-view.tsx`

- [ ] Step 1: Extract non-visual comment orchestration.

Move into `use-comment-section-state`:

- reply target state
- content state
- submit comment/reply orchestration
- login-required checks
- pending reply map
- comment like handling

Keep layout-specific scroll/ResizeObserver code in `CommentSection` unless it can be extracted cleanly without behavior changes.

- [ ] Step 2: Write tests for the hook.

Cover:

- reply action opens login modal when logged out
- comment submit calls `addComment`, clears content, and calls `onCommentAdded`
- reply submit increments reply count and stores pending reply
- like action opens login modal when logged out
- successful like updates the matching comment

- [ ] Step 3: Optionally split render list.

If `comment-section.tsx` remains over 250 lines, create `comment-list-view.tsx` with props:

- `comments`
- `isLoading`
- `error`
- `hasMore`
- `pendingReplies`
- `targetType`
- `onReply`
- `onLike`
- `onLoadMore`

- [ ] Step 4: Run targeted tests.

Run:

```bash
pnpm --filter web test:run apps/web/hooks/use-comment-section-state.test.ts apps/web/components/comments/comment-section.test.tsx
```

Expected: tests pass.

---

## Task 7: Migrate Remaining Web Hooks To Shared `apiJson`

**Files:**

- Modify: `apps/web/hooks/use-comment-list.ts`
- Modify: `apps/web/hooks/use-comment-submit.ts`
- Modify: `apps/web/hooks/use-comment-like.ts`
- Modify: `apps/web/hooks/use-guestbook-list.ts`
- Modify: `apps/web/hooks/use-guestbook-submit.ts`
- Modify: `apps/web/hooks/use-guestbook-like.ts`
- Modify if simple: `apps/web/app/circle/_components/circle-list.tsx`
- Tests: existing corresponding hook/component tests

- [ ] Step 1: Replace direct `fetch` with `apiJson`.

Keep endpoint paths unchanged.
Keep current user-facing error messages unchanged.
Use `buildQuery` for pagination URLs.

- [ ] Step 2: Preserve abort behavior.

Where a hook currently supports abort:

- pass `signal` through `apiJson`
- keep `AbortError` handling behavior equivalent

- [ ] Step 3: Run existing hook tests.

Run:

```bash
pnpm --filter web test:run apps/web/hooks/use-comment-list.test.ts apps/web/hooks/use-comment-submit.test.ts apps/web/hooks/use-guestbook-list.test.ts apps/web/hooks/use-guestbook-submit.test.ts
```

If some listed test files do not exist, create focused tests for the hooks changed in this task.

---

## Task 8: Full Verification And Cleanup

**Files:**

- No planned feature files; only fix failures found by verification.

- [ ] Step 1: Check for long files after refactor.

Run:

```bash
rg --files apps packages -g '!node_modules/**' -g '!.next/**' -g '!dist/**' -g '!coverage/**' -g '*.ts' -g '*.tsx' \
  | grep -v '\.test\.' \
  | xargs wc -l \
  | awk '$1 > 250 {print}' \
  | sort -nr
```

Expected:

- No app feature component over 250 lines unless it has a documented reason.
- Shared package internals like carousel/pagination may remain over 250 if not touched.

- [ ] Step 2: Check raw browser fetch usage.

Run:

```bash
rg -n "fetch\\(" apps/web -g '!node_modules/**' -g '!.next/**' -g '!*.test.*'
```

Expected:

- `fetch` remains only in route handlers, proxy/server files, auth/OAuth special cases, or documented fire-and-forget view tracking.
- General feature hooks/components should use `apiJson`/`apiForm`.

- [ ] Step 3: Run typecheck, lint, tests.

Run:

```bash
pnpm run check-types
pnpm run lint
pnpm run test:run
```

Expected: all pass.

- [ ] Step 4: Final manual smoke paths.

Run the web app and check:

- home article category/page switching
- article like when logged out opens login modal
- snippets all/friends/owner tabs and load more
- register captcha open/verify flow with mocked backend or local backend
- profile edit/save/avatar upload
- comment add/reply/like in modal and inline layouts

---

## Suggested Commit Slices

Use the repo `git-commit` skill before each commit. Suggested slices:

- `refactor(web): 抽取浏览器请求工具`
- `refactor(web): 收敛文章列表状态`
- `fix(web): 修正碎语筛选刷新参数`
- `refactor(web): 拆分注册表单逻辑`
- `refactor(web): 收敛用户资料编辑逻辑`
- `refactor(web): 拆分评论区状态`
- `test(web): 补齐架构清理回归测试`

Commit subject must satisfy `scripts/validate-commit-msg.cjs`.
