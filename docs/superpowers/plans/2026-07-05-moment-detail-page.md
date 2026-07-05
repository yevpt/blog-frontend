# 碎语详情页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `/moments/[id]` 碎语详情页，并修正通知中心、个人主页「赞过」列表里指向碎语的跳转，让它们能定位到具体一条碎语。

**Architecture:** Server Component 路由直接用 `createServerApiClient().moments.getDetail(id)` 取详情（后端已提供 `GET /moments/{id}`，返回结构即现有 `MomentItemResp`），页面内渲染两个客户端组件——`MomentDetail`（复用现成的 `MomentCard` + 新 hook `useMomentDetail` 管点赞/编辑/置顶/删除）和 `MomentComments`（复用现成的 `InlineComments`，`targetType="moment"` 已原生支持）。不新建卡片样式，不新建评论系统，只新建"胶水"代码。

**Tech Stack:** Next.js App Router（Server Component + `'use client'` 叶子组件）、Zustand（`useMomentModal`/`useLoginModal` 全局态）、Vitest + Testing Library。

## Global Constraints

- 禁 `any`；优先纯函数 + Early Return；非显然逻辑写中文注释（来自 AGENTS.md）。
- 改 Hook → `*.test.ts`，组件 → `*.test.tsx`，页面 → `page.test.tsx`；缺测视为未完成。
- `packages/api` 改动需同时更新 `client.test.ts`。
- 每个 Task 完成后单独提交，commit message 需过 `commit-msg` 钩子。

---

## File Structure

**新建：**

| 文件 | 职责 |
|---|---|
| `apps/web/hooks/use-moment-detail.ts` | 单条碎语的点赞/编辑保存/置顶/删除交互（`use-moment-list.ts` 同名逻辑的单条目版本） |
| `apps/web/hooks/use-moment-detail.test.ts` | 上面 hook 的单测 |
| `apps/web/components/moments/pack-moment-images-form-data.ts` | 从 `use-moment-list.ts` 抽出的"图片数组→FormData"纯函数，供列表编辑和详情编辑共用 |
| `apps/web/components/moments/pack-moment-images-form-data.test.ts` | 上面函数的单测 |
| `apps/web/components/moments/moment-comments.tsx` | 详情页内联评论区（照抄 `article-comments.tsx`，换成 `targetType="moment"`） |
| `apps/web/components/moments/moment-comments.test.tsx` | 上面组件的单测 |
| `apps/web/components/moments/moment-detail.tsx` | 详情页主体：`useMomentDetail` + `MomentCard` + 打开全局编辑弹窗的胶水逻辑 |
| `apps/web/components/moments/moment-detail.test.tsx` | 上面组件的单测 |
| `apps/web/app/moments/[id]/page.tsx` | 详情页路由：`generateMetadata` + Server Component 取数 + 404 |
| `apps/web/app/moments/[id]/page.test.tsx` | 上面路由的单测 |

**修改：**

| 文件 | 改动 |
|---|---|
| `packages/api/src/client.ts` | `moments` 下新增 `getDetail` |
| `packages/api/src/client.test.ts` | 新增 `moments.getDetail` 用例 |
| `apps/web/hooks/use-moment-list.ts` | `updateMoment` 里内联的图片打包循环改为调用 `packMomentImagesFormData` |
| `apps/web/components/notifications/notification-target.ts` | `root_type === "moment"` 返回具体详情页地址 |
| `apps/web/components/notifications/notification-target.test.ts` | 更新对应断言 |
| `apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.ts` | `getLikedContentRootHref` 里两处 `moment` 分支返回具体详情页地址 |
| `apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.test.ts` | 新增碎语相关断言 |

---

## Task 1: API 客户端新增 `moments.getDetail`

**Files:**
- Modify: `packages/api/src/client.ts:688-690`
- Test: `packages/api/src/client.test.ts`

**Interfaces:**
- Produces: `client.moments.getDetail(id: number): Promise<MomentItemResp>`，供 Task 6 的 Server Component 调用。

- [ ] **Step 1: 写失败的测试**

在 `packages/api/src/client.test.ts` 第 1687 行（`moments.view 调用正确的端点` 测试块结束的 `});` 之后、`articles.getAdminDetail` 测试之前）插入：

```ts
  it("moments.getDetail 调用正确的端点", async () => {
    const detail: MomentItemResp = {
      id: 1,
      user_id: 1,
      content: "今天的风很温柔",
      status: 1,
      comment_status: 1,
      read_count: 20,
      is_top: false,
      like_count: 3,
      comment_count: 2,
      is_liked: false,
      images: [],
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: detail }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    const result = await client.moments.getDetail(1);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/moments/1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.content).toBe("今天的风很温柔");
  });
```

文件顶部第 4 行的类型导入改为：

```ts
import type { ArticleDetailResp, ArticlePageResp } from "./types/article";
```

在其后新增一行：

```ts
import type { MomentItemResp } from "./types/moment";
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @repo/api test -- client.test.ts -t "moments.getDetail"`
Expected: FAIL，报 `client.moments.getDetail is not a function`

- [ ] **Step 3: 实现**

在 `packages/api/src/client.ts` 第 688-690 行（`view` 方法后、`listPublic` 前）：

原文：

```ts
      /** 上报一次碎语阅读（触发即可，不等待返回值） */
      view: (id: number) => fetchPublic<void>(`/moments/${id}/view`, { method: "POST" }),
      /** 分页查询公开碎语，支持用户/角色过滤；登录态可返回 is_liked */
      listPublic: (req: MomentListReq = {}) => {
```

改为：

```ts
      /** 上报一次碎语阅读（触发即可，不等待返回值） */
      view: (id: number) => fetchPublic<void>(`/moments/${id}/view`, { method: "POST" }),
      /** 查询单条碎语详情，未登录可访问，登录态返回 is_liked */
      getDetail: (id: number) =>
        fetchOptionalAuth<MomentItemResp>(`/moments/${id}`, { method: "GET" }),
      /** 分页查询公开碎语，支持用户/角色过滤；登录态可返回 is_liked */
      listPublic: (req: MomentListReq = {}) => {
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @repo/api test -- client.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add packages/api/src/client.ts packages/api/src/client.test.ts
git commit -m "feat(api): 新增碎语详情查询接口"
```

---

## Task 2: 抽出图片打包公共函数

**Files:**
- Create: `apps/web/components/moments/pack-moment-images-form-data.ts`
- Create: `apps/web/components/moments/pack-moment-images-form-data.test.ts`
- Modify: `apps/web/hooks/use-moment-list.ts`

**Interfaces:**
- Consumes: `MomentImageItem`（`apps/web/components/moments/types.ts` 已有）
- Produces: `packMomentImagesFormData(form: FormData, images: MomentImageItem[]): void`，供 Task 3 的 `useMomentDetail.updateMoment` 使用。

- [ ] **Step 1: 写失败的测试**

创建 `apps/web/components/moments/pack-moment-images-form-data.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { packMomentImagesFormData } from "./pack-moment-images-form-data";
import type { MomentImageItem } from "./types";

describe("packMomentImagesFormData", () => {
  it("本地文件走 images/file 顺序，远程图片走 image_urls/url 顺序", () => {
    const form = new FormData();
    const images: MomentImageItem[] = [
      {
        id: "r1",
        remoteUrl: "https://example.com/old.png",
        previewUrl: "https://example.com/old.png",
      },
      {
        id: "f1",
        file: new File([new Uint8Array(1)], "new.png", { type: "image/png" }),
        previewUrl: "blob:new",
      },
    ];

    packMomentImagesFormData(form, images);

    expect(form.getAll("image_urls")).toEqual(["https://example.com/old.png"]);
    expect(form.getAll("images").length).toBe(1);
    expect(form.getAll("image_order")).toEqual(["url:0", "file:0"]);
  });

  it("既无 file 也无 remoteUrl 的图片被跳过", () => {
    const form = new FormData();
    packMomentImagesFormData(form, [{ id: "empty", previewUrl: "blob:empty" }]);

    expect(form.getAll("images").length).toBe(0);
    expect(form.getAll("image_urls").length).toBe(0);
    expect(form.getAll("image_order").length).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- pack-moment-images-form-data.test.ts`
Expected: FAIL，报找不到模块 `./pack-moment-images-form-data`

- [ ] **Step 3: 实现**

创建 `apps/web/components/moments/pack-moment-images-form-data.ts`：

```ts
import type { MomentImageItem } from "./types";

/**
 * 把碎语图片数组打包进 multipart FormData：
 * 本地新增图片走 images / image_order=file:i；已有远程图片走 image_urls / image_order=url:i。
 * 两类图片按传入顺序交替 append，`image_order` 用于后端还原最终排序。
 */
export function packMomentImagesFormData(form: FormData, images: MomentImageItem[]): void {
  images.forEach((image) => {
    if (image.file) {
      form.append("images", image.file, image.file.name);
      form.append("image_order", `file:${form.getAll("images").length - 1}`);
    } else if (image.remoteUrl) {
      form.append("image_urls", image.remoteUrl);
      form.append("image_order", `url:${form.getAll("image_urls").length - 1}`);
    }
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- pack-moment-images-form-data.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 改造 `use-moment-list.ts` 复用该函数**

在 `apps/web/hooks/use-moment-list.ts` 顶部导入区（第 19 行 `mergePageWithPublishedMoment` 导入之后）新增：

```ts
import { packMomentImagesFormData } from "@/components/moments/pack-moment-images-form-data";
```

将第 401-409 行：

```ts
        images.forEach((image) => {
          if (image.file) {
            form.append("images", image.file, image.file.name);
            form.append("image_order", `file:${form.getAll("images").length - 1}`);
          } else if (image.remoteUrl) {
            form.append("image_urls", image.remoteUrl);
            form.append("image_order", `url:${form.getAll("image_urls").length - 1}`);
          }
        });
```

改为：

```ts
        packMomentImagesFormData(form, images);
```

- [ ] **Step 6: 运行 `use-moment-list` 现有测试确认未破坏行为**

Run: `pnpm --filter web test -- use-moment-list.test.ts`
Expected: 全部 PASS（尤其是 `updateMoment saves through multipart endpoint and replaces moment locally` 这条，断言的 `image_urls`/`images`/`image_order` 顺序应保持不变）

- [ ] **Step 7: 提交**

```bash
git add apps/web/components/moments/pack-moment-images-form-data.ts apps/web/components/moments/pack-moment-images-form-data.test.ts apps/web/hooks/use-moment-list.ts
git commit -m "refactor(moments): 抽出图片打包 FormData 公共函数"
```

---

## Task 3: `useMomentDetail` hook

**Files:**
- Create: `apps/web/hooks/use-moment-detail.ts`
- Test: `apps/web/hooks/use-moment-detail.test.ts`

**Interfaces:**
- Consumes: `packMomentImagesFormData`（Task 2）、`momentEditFingerprint`（`apps/web/components/moments/moment-submit-fingerprint.ts` 已有）、`logMomentUploadImages`（`apps/web/components/moments/log-moment-upload-images.ts` 已有）
- Produces:
  ```ts
  function useMomentDetail(initialMoment: MomentItemResp): {
    moment: MomentItemResp;
    likePending: boolean;
    actionPending: boolean;
    toggleLike: (target: MomentItemResp) => Promise<void>;
    updateMoment: (content: string, images: MomentImageItem[]) => Promise<MomentItemResp>;
    toggleTop: (target: MomentItemResp) => Promise<void>;
    deleteMoment: (target: MomentItemResp) => Promise<void>;
  }
  ```
  供 Task 5 的 `MomentDetail` 组件使用。

- [ ] **Step 1: 写失败的测试**

创建 `apps/web/hooks/use-moment-detail.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MomentItemResp } from "@repo/api";
import { useMomentDetail } from "./use-moment-detail";

const { mockOpenLoginModal, mockAddToast, mockRouterPush } = vi.hoisted(() => ({
  mockOpenLoginModal: vi.fn(),
  mockAddToast: vi.fn(),
  mockRouterPush: vi.fn(),
}));
let mockSessionUserId: number | null = 7;

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: null }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: mockAddToast,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 1,
    content: "详情碎语",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 2,
    comment_count: 1,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function lastFetchInit(): { headers?: Record<string, string> } | undefined {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  return call?.[1] as { headers?: Record<string, string> } | undefined;
}

describe("useMomentDetail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSessionUserId = 7;
    mockOpenLoginModal.mockReset();
    mockAddToast.mockReset();
    mockRouterPush.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("初始状态返回传入的碎语", () => {
    const { result } = renderHook(() => useMomentDetail(makeMoment()));
    expect(result.current.moment.content).toBe("详情碎语");
    expect(result.current.likePending).toBe(false);
    expect(result.current.actionPending).toBe(false);
  });

  it("toggleLike 未登录时打开登录弹窗且不发请求", async () => {
    mockSessionUserId = null;
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleLike(makeMoment());
    });

    expect(mockOpenLoginModal).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("toggleLike 内容不可交互时不发请求", async () => {
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleLike(makeMoment({ moderation: { can_interact: false } }));
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("toggleLike 成功后更新点赞状态与数量", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ is_liked: true, like_count: 3 }));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleLike(makeMoment());
    });

    expect(fetch).toHaveBeenCalledWith("/api/moments/1/like", expect.objectContaining({ method: "POST" }));
    expect(result.current.moment.is_liked).toBe(true);
    expect(result.current.moment.like_count).toBe(3);
  });

  it("toggleLike 业务错误时 toast 展示后端返回的具体原因", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "碎语已锁定，无法点赞" }, 400));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleLike(makeMoment());
    });

    expect(mockAddToast).toHaveBeenCalledWith("碎语已锁定，无法点赞", "error");
  });

  it("updateMoment 成功后更新碎语并 toast", async () => {
    const updated = makeMoment({ content: "更新后的碎语" });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.updateMoment("更新后的碎语", []);
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("/api/moments");
    expect(init).toMatchObject({ method: "POST" });
    expect(result.current.moment.content).toBe("更新后的碎语");
    expect(mockAddToast).toHaveBeenCalledWith("碎语已更新", "success");
  });

  it("updateMoment 携带 moment-edit 幂等键", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeMoment({ content: "x" })));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.updateMoment("x", []);
    });

    expect(lastFetchInit()?.headers?.["Idempotency-Key"]).toBeTruthy();
  });

  it("updateMoment 业务错误时 toast 展示具体原因并抛出", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "内容包含敏感词" }, 400));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await expect(result.current.updateMoment("超长", [])).rejects.toThrow();
    });

    expect(mockAddToast).toHaveBeenCalledWith("内容包含敏感词", "error");
  });

  it("toggleTop 未置顶时调用 POST，已置顶时调用 DELETE", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1, is_top: true }));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleTop(makeMoment());
    });

    expect(fetch).toHaveBeenCalledWith("/api/moments/1/top", expect.objectContaining({ method: "POST" }));
    expect(result.current.moment.is_top).toBe(true);

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1, is_top: false }));
    await act(async () => {
      await result.current.toggleTop(makeMoment({ is_top: true }));
    });

    expect(fetch).toHaveBeenCalledWith("/api/moments/1/top", expect.objectContaining({ method: "DELETE" }));
    expect(result.current.moment.is_top).toBe(false);
  });

  it("toggleTop 业务错误时 toast 展示具体原因", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "置顶数量已达上限" }, 400));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleTop(makeMoment());
    });

    expect(mockAddToast).toHaveBeenCalledWith("置顶数量已达上限", "error");
  });

  it("deleteMoment 成功后 toast 并跳转到碎语列表页", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1 }));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.deleteMoment(makeMoment());
    });

    expect(fetch).toHaveBeenCalledWith("/api/moments/1", expect.objectContaining({ method: "DELETE" }));
    expect(mockAddToast).toHaveBeenCalledWith("碎语已删除", "success");
    expect(mockRouterPush).toHaveBeenCalledWith("/moments");
  });

  it("deleteMoment 业务错误时 toast 展示具体原因并抛出，不跳转", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "无权删除该碎语" }, 403));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await expect(result.current.deleteMoment(makeMoment())).rejects.toThrow();
    });

    expect(mockAddToast).toHaveBeenCalledWith("无权删除该碎语", "error");
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("401 时统一打开登录弹窗（以 toggleTop 为例）", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401));
    const { result } = renderHook(() => useMomentDetail(makeMoment()));

    await act(async () => {
      await result.current.toggleTop(makeMoment());
    });

    expect(mockOpenLoginModal).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- use-moment-detail.test.ts`
Expected: FAIL，报找不到模块 `./use-moment-detail`

- [ ] **Step 3: 实现**

创建 `apps/web/hooks/use-moment-detail.ts`：

```ts
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { MomentDeleteResp, MomentItemResp, MomentLikeResp, MomentTopResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { apiForm, apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { normalizeModerationView } from "@/components/moderation";
import { packMomentImagesFormData } from "@/components/moments/pack-moment-images-form-data";
import { momentEditFingerprint } from "@/components/moments/moment-submit-fingerprint";
import { logMomentUploadImages } from "@/components/moments/log-moment-upload-images";
import type { MomentImageItem } from "@/components/moments/types";

/** 碎语详情页的点赞/编辑保存/置顶/删除交互；是 use-moment-list.ts 同名逻辑的单条目版本 */
export function useMomentDetail(initialMoment: MomentItemResp) {
  const router = useRouter();
  const { userId: sessionUserId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  // 编辑碎语复用 moment-edit 幂等键：同载荷重试保留，成功或明确 4xx 后 reset
  const { getIdempotencyKey, resetIdempotencyKey } = useIdempotencyKey("moment-edit");

  const [moment, setMoment] = useState(initialMoment);
  const [likePending, setLikePending] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const toggleLike = useCallback(
    async (target: MomentItemResp) => {
      if (sessionUserId == null) {
        openLoginModal();
        return;
      }
      if (!normalizeModerationView(target.moderation).can_interact) {
        return;
      }
      if (likePending) {
        return;
      }

      setLikePending(true);
      try {
        const data = await apiJson<MomentLikeResp>(`/api/moments/${target.id}/like`, {
          method: "POST",
        });
        setMoment((current) => ({
          ...current,
          is_liked: data.is_liked,
          like_count: data.like_count,
        }));
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(
          getApiErrorMessage(
            err,
            target.is_liked ? "取消点赞失败，请稍后重试" : "点赞失败，请稍后重试",
          ),
          "error",
        );
      } finally {
        setLikePending(false);
      }
    },
    [likePending, openLoginModal, sessionUserId],
  );

  const updateMoment = useCallback(
    async (content: string, images: MomentImageItem[]) => {
      if (actionPending) {
        return moment;
      }

      setActionPending(true);
      try {
        const form = new FormData();
        form.append("id", String(moment.id));
        form.append("content", content);
        form.append("status", String(moment.status));
        form.append("comment_status", String(moment.comment_status));
        packMomentImagesFormData(form, images);

        logMomentUploadImages("publish", images);
        const key = getIdempotencyKey(
          momentEditFingerprint(moment.id, content, moment.status, moment.comment_status, images),
        );
        const updated = await apiForm<MomentItemResp>("/api/moments", form, {
          method: "POST",
          headers: { "Idempotency-Key": key },
        });
        resetIdempotencyKey();
        setMoment(updated);
        addToast(updated.moderation?.notice ?? "碎语已更新", "success");
        return updated;
      } catch (err) {
        // 明确 4xx（含高风险拦截、401）后 reset；5xx 与网络错误保留同载荷键以便幂等重试
        if (err instanceof ApiClientError && err.status >= 400 && err.status < 500) {
          resetIdempotencyKey();
        }
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
        } else {
          addToast(getApiErrorMessage(err, "更新失败，请稍后重试"), "error");
        }
        throw err;
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, moment, getIdempotencyKey, resetIdempotencyKey, openLoginModal],
  );

  const toggleTop = useCallback(
    async (target: MomentItemResp) => {
      if (actionPending) {
        return;
      }

      setActionPending(true);
      try {
        const data = await apiJson<MomentTopResp>(`/api/moments/${target.id}/top`, {
          method: target.is_top ? "DELETE" : "POST",
        });
        setMoment((current) => ({ ...current, is_top: data.is_top }));
        addToast(data.is_top ? "已置顶" : "已取消置顶", "success");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(
          getApiErrorMessage(
            err,
            target.is_top ? "取消置顶失败，请稍后重试" : "置顶失败，请稍后重试",
          ),
          "error",
        );
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, openLoginModal],
  );

  const deleteMoment = useCallback(
    async (target: MomentItemResp) => {
      if (actionPending) {
        return;
      }

      setActionPending(true);
      try {
        await apiJson<MomentDeleteResp>(`/api/moments/${target.id}`, { method: "DELETE" });
        addToast("碎语已删除", "success");
        router.push("/moments");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(getApiErrorMessage(err, "删除失败，请稍后重试"), "error");
        throw err;
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, openLoginModal, router],
  );

  return { moment, likePending, actionPending, toggleLike, updateMoment, toggleTop, deleteMoment };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- use-moment-detail.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/hooks/use-moment-detail.ts apps/web/hooks/use-moment-detail.test.ts
git commit -m "feat(moments): 新增碎语详情页交互 hook"
```

---

## Task 4: `MomentComments` 内联评论区

**Files:**
- Create: `apps/web/components/moments/moment-comments.tsx`
- Test: `apps/web/components/moments/moment-comments.test.tsx`

**Interfaces:**
- Consumes: `InlineComments`（`@/components/comments`，已支持 `targetType="moment"`）
- Produces: `<MomentComments momentId={number} commentCount={number} />`，供 Task 6 的 page.tsx 使用。

- [ ] **Step 1: 写失败的测试**

创建 `apps/web/components/moments/moment-comments.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MomentComments } from "./moment-comments";

vi.mock("@/components/comments", () => ({
  InlineComments: ({
    targetId,
    targetType,
    expectedCommentCount,
    onCommentAdded,
  }: {
    targetId: number;
    targetType: string;
    expectedCommentCount?: number;
    onCommentAdded?: () => void;
  }) => (
    <div
      data-testid="inline-comments"
      data-target-id={String(targetId)}
      data-target-type={targetType}
      data-expected-comment-count={String(expectedCommentCount ?? "")}
    >
      <button data-testid="trigger-comment-added" onClick={onCommentAdded}>
        模拟添加评论
      </button>
    </div>
  ),
}));

describe("MomentComments", () => {
  it("渲染评论标题和计数", () => {
    render(<MomentComments momentId={42} commentCount={7} />);
    expect(screen.getByRole("heading", { name: /评论/ })).toBeInTheDocument();
    expect(screen.getByText("7 条")).toBeInTheDocument();
  });

  it("评论区根节点带稳定锚点 id", () => {
    const { container } = render(<MomentComments momentId={42} commentCount={7} />);
    expect(container.querySelector("#moment-detail-comments")).toBeInTheDocument();
  });

  it("向 InlineComments 传入正确的 targetId 和 targetType", () => {
    render(<MomentComments momentId={42} commentCount={7} />);
    const section = screen.getByTestId("inline-comments");
    expect(section).toHaveAttribute("data-target-id", "42");
    expect(section).toHaveAttribute("data-target-type", "moment");
    expect(section).toHaveAttribute("data-expected-comment-count", "7");
  });

  it("onCommentAdded 触发后评论计数递增", async () => {
    const user = userEvent.setup();
    render(<MomentComments momentId={42} commentCount={7} />);
    expect(screen.getByText("7 条")).toBeTruthy();
    await user.click(screen.getByTestId("trigger-comment-added"));
    expect(screen.getByText("8 条")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- moment-comments.test.tsx`
Expected: FAIL，报找不到模块 `./moment-comments`

- [ ] **Step 3: 实现**

创建 `apps/web/components/moments/moment-comments.tsx`：

```tsx
"use client";

import { useCallback, useState } from "react";
import { InlineComments } from "@/components/comments";

interface MomentCommentsProps {
  momentId: number;
  commentCount: number;
}

export function MomentComments({ momentId, commentCount: initialCount }: MomentCommentsProps) {
  const [commentCount, setCommentCount] = useState(initialCount);

  const handleCommentAdded = useCallback(() => {
    setCommentCount((prev) => prev + 1);
  }, []);

  return (
    <section
      id="moment-detail-comments"
      className="mx-auto max-w-[680px] border-t border-border px-2 pb-20 pt-10 md:px-0"
    >
      <h2 className="mb-6 text-lg font-bold text-foreground">
        评论{" "}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{commentCount} 条</span>
      </h2>
      <InlineComments
        targetType="moment"
        targetId={momentId}
        expectedCommentCount={commentCount}
        onCommentAdded={handleCommentAdded}
      />
    </section>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- moment-comments.test.tsx`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/moments/moment-comments.tsx apps/web/components/moments/moment-comments.test.tsx
git commit -m "feat(moments): 新增碎语详情页内联评论区"
```

---

## Task 5: `MomentDetail` 主体组件

**Files:**
- Create: `apps/web/components/moments/moment-detail.tsx`
- Test: `apps/web/components/moments/moment-detail.test.tsx`

**Interfaces:**
- Consumes: `useMomentDetail`（Task 3）、`MomentCard`（`./moment-card`，已有，props 见其定义）、`useMomentModal`（`@/store/use-moment-modal`，已有 `open(moment, submitEdit)` 动作）
- Produces: `<MomentDetail initialMoment={MomentItemResp} />`，供 Task 6 的 page.tsx 使用。

- [ ] **Step 1: 写失败的测试**

创建 `apps/web/components/moments/moment-detail.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MomentItemResp } from "@repo/api";
import { MomentDetail } from "./moment-detail";

const mockToggleLike = vi.fn();
const mockUpdateMoment = vi.fn();
const mockToggleTop = vi.fn();
const mockDeleteMoment = vi.fn();
const mockOpenMomentModal = vi.fn();

vi.mock("@/hooks/use-moment-detail", () => ({
  useMomentDetail: (initialMoment: MomentItemResp) => ({
    moment: initialMoment,
    likePending: false,
    actionPending: false,
    toggleLike: mockToggleLike,
    updateMoment: mockUpdateMoment,
    toggleTop: mockToggleTop,
    deleteMoment: mockDeleteMoment,
  }),
}));

vi.mock("@/store/use-moment-modal", () => ({
  useMomentModal: (selector: (state: { open: typeof mockOpenMomentModal }) => unknown) =>
    selector({ open: mockOpenMomentModal }),
}));

vi.mock("./moment-card", () => ({
  MomentCard: ({
    moment,
    onLike,
    onComment,
    onEdit,
    onToggleTop,
    onDelete,
  }: {
    moment: { id: number; content: string };
    onLike?: (moment: unknown) => void;
    onComment?: (moment: unknown) => void;
    onEdit?: (moment: unknown) => void;
    onToggleTop?: (moment: unknown) => void;
    onDelete?: (moment: unknown) => void;
  }) => (
    <div data-testid="moment-card">
      <span>{moment.content}</span>
      <button aria-label="点赞" onClick={() => onLike?.(moment)} />
      <button aria-label="评论" onClick={() => onComment?.(moment)} />
      <button aria-label="编辑" onClick={() => onEdit?.(moment)} />
      <button aria-label="置顶" onClick={() => onToggleTop?.(moment)} />
      <button aria-label="删除" onClick={() => onDelete?.(moment)} />
    </div>
  ),
}));

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 1,
    content: "详情碎语",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 2,
    comment_count: 1,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

describe("MomentDetail", () => {
  it("渲染碎语内容", () => {
    render(<MomentDetail initialMoment={makeMoment()} />);
    expect(screen.getByText("详情碎语")).toBeInTheDocument();
  });

  it("点击点赞调用 useMomentDetail.toggleLike", async () => {
    const user = userEvent.setup();
    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("点赞"));
    expect(mockToggleLike).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("点击编辑打开全局编辑弹窗并传入当前碎语与 updateMoment", async () => {
    const user = userEvent.setup();
    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("编辑"));
    expect(mockOpenMomentModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      mockUpdateMoment,
    );
  });

  it("点击置顶调用 useMomentDetail.toggleTop", async () => {
    const user = userEvent.setup();
    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("置顶"));
    expect(mockToggleTop).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("点击删除调用 useMomentDetail.deleteMoment", async () => {
    const user = userEvent.setup();
    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("删除"));
    expect(mockDeleteMoment).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("点击评论滚动到内联评论区锚点", async () => {
    const user = userEvent.setup();
    const scrollIntoViewMock = vi.fn();
    const anchor = document.createElement("div");
    anchor.id = "moment-detail-comments";
    anchor.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(anchor);

    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("评论"));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
    document.body.removeChild(anchor);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- moment-detail.test.tsx`
Expected: FAIL，报找不到模块 `./moment-detail`

- [ ] **Step 3: 实现**

创建 `apps/web/components/moments/moment-detail.tsx`：

```tsx
"use client";

import { useCallback } from "react";
import type { MomentItemResp } from "@repo/api";
import { useMomentModal } from "@/store/use-moment-modal";
import { useMomentDetail } from "@/hooks/use-moment-detail";
import { MomentCard } from "./moment-card";

interface MomentDetailProps {
  initialMoment: MomentItemResp;
}

/** 评论按钮点击滚动到下方内联评论区，而非像列表页那样打开评论弹窗 */
function scrollToComments() {
  document.getElementById("moment-detail-comments")?.scrollIntoView({ behavior: "smooth" });
}

export function MomentDetail({ initialMoment }: MomentDetailProps) {
  const { moment, likePending, actionPending, toggleLike, updateMoment, toggleTop, deleteMoment } =
    useMomentDetail(initialMoment);
  const openMomentModal = useMomentModal((state) => state.open);

  const openEdit = useCallback(() => {
    openMomentModal(moment, updateMoment);
  }, [moment, openMomentModal, updateMoment]);

  return (
    <MomentCard
      moment={moment}
      layout="standalone"
      onLike={toggleLike}
      likeDisabled={likePending}
      onComment={scrollToComments}
      onEdit={openEdit}
      onToggleTop={toggleTop}
      onDelete={deleteMoment}
      actionDisabled={actionPending}
    />
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- moment-detail.test.tsx`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/moments/moment-detail.tsx apps/web/components/moments/moment-detail.test.tsx
git commit -m "feat(moments): 新增碎语详情页主体组件"
```

---

## Task 6: `/moments/[id]` 页面路由

**Files:**
- Create: `apps/web/app/moments/[id]/page.tsx`
- Test: `apps/web/app/moments/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `createServerApiClient().moments.getDetail`（Task 1）、`MomentDetail`（Task 5）、`MomentComments`（Task 4）、`getCanonicalUrl`（`@/lib/seo`，已有）、`PageContainer`（`@/components/common/page-container`，已有，`size="narrow"` = 680px）

- [ ] **Step 1: 写失败的测试**

创建 `apps/web/app/moments/[id]/page.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MomentItemResp } from "@repo/api";
import MomentDetailPage, { generateMetadata } from "./page";

const mockState = vi.hoisted(() => ({
  getDetail: vi.fn(),
}));

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    moments: { getDetail: mockState.getDetail },
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

vi.mock("@/components/moments/moment-detail", () => ({
  MomentDetail: ({ initialMoment }: { initialMoment: MomentItemResp }) => (
    <div data-testid="moment-detail">{initialMoment.content}</div>
  ),
}));

vi.mock("@/components/moments/moment-comments", () => ({
  MomentComments: ({ momentId, commentCount }: { momentId: number; commentCount: number }) => (
    <div data-testid="moment-comments">
      {momentId}-{commentCount}
    </div>
  ),
}));

const mockMoment: MomentItemResp = {
  id: 1,
  user_id: 1,
  content: "今天的风很温柔",
  status: 1,
  comment_status: 1,
  read_count: 20,
  is_top: false,
  like_count: 3,
  comment_count: 2,
  is_liked: false,
  images: [],
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

describe("MomentDetailPage", () => {
  beforeEach(() => {
    mockState.getDetail.mockReset();
  });

  it("渲染碎语内容与评论区", async () => {
    mockState.getDetail.mockResolvedValue(mockMoment);
    render(await MomentDetailPage({ params: Promise.resolve({ id: "1" }) }));
    expect(screen.getByTestId("moment-detail")).toHaveTextContent("今天的风很温柔");
    expect(screen.getByTestId("moment-comments")).toHaveTextContent("1-2");
  });

  it("id 不是正整数时 404", async () => {
    await expect(MomentDetailPage({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow(
      "NOT_FOUND",
    );
    expect(mockState.getDetail).not.toHaveBeenCalled();
  });

  it("getDetail 抛错时 404", async () => {
    mockState.getDetail.mockRejectedValue(new Error("not found"));
    await expect(MomentDetailPage({ params: Promise.resolve({ id: "999" }) })).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("metadata 使用碎语正文生成标题", async () => {
    mockState.getDetail.mockResolvedValue(mockMoment);
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toBe("今天的风很温柔 | Yevpt's Blog");
  });

  it("metadata 正文超长时截断并加省略号", async () => {
    const longContent = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十";
    mockState.getDetail.mockResolvedValue({ ...mockMoment, content: longContent });
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toBe(`${longContent.slice(0, 30)}… | Yevpt's Blog`);
  });

  it("metadata 无正文（纯图片）时使用兜底标题", async () => {
    mockState.getDetail.mockResolvedValue({ ...mockMoment, content: "" });
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toBe("碎语 | Yevpt's Blog");
  });

  it("metadata 取第一张原图作为 openGraph 封面", async () => {
    mockState.getDetail.mockResolvedValue({
      ...mockMoment,
      images: [
        {
          id: 1,
          name: "a.jpg",
          file_type: "jpg",
          url: "a.jpg",
          access_url: "https://cdn/a.jpg",
          display_mode: "blurred",
          size: 1,
          seq: 1,
        },
        {
          id: 2,
          name: "b.jpg",
          file_type: "jpg",
          url: "b.jpg",
          access_url: "https://cdn/b.jpg",
          display_mode: "original",
          size: 1,
          seq: 2,
        },
      ],
    });
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.openGraph?.images).toEqual(["https://cdn/b.jpg"]);
  });

  it("getDetail 失败时 metadata 兜底标题", async () => {
    mockState.getDetail.mockRejectedValue(new Error("fail"));
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toBe("碎语 | Yevpt's Blog");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- app/moments/\[id\]/page.test.tsx`
Expected: FAIL，报找不到模块 `./page`

- [ ] **Step 3: 实现**

创建 `apps/web/app/moments/[id]/page.tsx`：

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { getCanonicalUrl } from "@/lib/seo";
import { PageContainer } from "@/components/common/page-container";
import { MomentDetail } from "@/components/moments/moment-detail";
import { MomentComments } from "@/components/moments/moment-comments";

interface PageProps {
  params: Promise<{ id: string }>;
}

const MOMENT_TITLE_MAX_LENGTH = 30;

function buildMomentTitle(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "碎语";
  }
  if (trimmed.length <= MOMENT_TITLE_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MOMENT_TITLE_MAX_LENGTH)}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const api = await createServerApiClient();
    const moment = await api.moments.getDetail(Number(id));
    const title = `${buildMomentTitle(moment.content)} | Yevpt's Blog`;
    const description = moment.content || "生活、思考与随笔的碎碎念";
    const canonical = getCanonicalUrl(`/moments/${moment.id}`).toString();
    const coverImage = moment.images.find((img) => img.display_mode === "original")?.access_url;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "article",
        publishedTime: moment.created_at,
        modifiedTime: moment.updated_at,
        images: coverImage ? [coverImage] : undefined,
      },
    };
  } catch {
    return { title: "碎语 | Yevpt's Blog" };
  }
}

export default async function MomentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const momentId = Number(id);

  if (!Number.isInteger(momentId) || momentId <= 0) notFound();

  const api = await createServerApiClient();
  let moment;
  try {
    moment = await api.moments.getDetail(momentId);
  } catch {
    notFound();
  }

  return (
    <PageContainer size="narrow">
      <MomentDetail initialMoment={moment} />
      <MomentComments momentId={moment.id} commentCount={moment.comment_count} />
    </PageContainer>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- app/moments/\[id\]/page.test.tsx`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/app/moments/\[id\]/page.tsx apps/web/app/moments/\[id\]/page.test.tsx
git commit -m "feat(moments): 新增碎语详情页路由"
```

---

## Task 7: 修正通知中心的碎语跳转

**Files:**
- Modify: `apps/web/components/notifications/notification-target.ts:10-12`
- Modify: `apps/web/components/notifications/notification-target.test.ts:29-31`

- [ ] **Step 1: 改测试期望（先改到会失败的状态）**

将 `apps/web/components/notifications/notification-target.test.ts` 第 29-31 行：

```ts
  it("moment 通知跳转碎语页而不是圈子页", () => {
    expect(getNotificationHref(item({ root_type: "moment", root_id: 9 }))).toBe("/moments");
  });
```

改为：

```ts
  it("moment 通知跳转到具体碎语详情页", () => {
    expect(getNotificationHref(item({ root_type: "moment", root_id: 9 }))).toBe("/moments/9");
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- notification-target.test.ts`
Expected: FAIL，实际返回 `/moments`，期望 `/moments/9`

- [ ] **Step 3: 实现**

将 `apps/web/components/notifications/notification-target.ts` 第 10-12 行：

```ts
  if (item.root_type === "moment") {
    return "/moments";
  }
```

改为：

```ts
  if (item.root_type === "moment") {
    return `/moments/${item.root_id}`;
  }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- notification-target.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/components/notifications/notification-target.ts apps/web/components/notifications/notification-target.test.ts
git commit -m "fix(notifications): 碎语通知跳转到具体详情页"
```

---

## Task 8: 修正「赞过」列表的碎语跳转

**Files:**
- Modify: `apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.ts:53-58,75-77`
- Modify: `apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.test.ts`

- [ ] **Step 1: 写失败的测试**

在 `apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.test.ts` 的 `describe("liked-content-format", ...)` 块内、"评论跳转携带评论锚点" 测试之后插入：

```ts
  it("碎语点赞跳转到碎语详情页", () => {
    expect(
      getLikedContentRootHref(
        makeItem({ kind: "moment", filter: "moment", content: { id: 77, excerpt: "碎语摘要" } }),
      ),
    ).toBe("/moments/77");
  });

  it("碎语已删除时跳转地址为空", () => {
    expect(
      getLikedContentRootHref(
        makeItem({
          kind: "moment",
          filter: "moment",
          content: { id: 77, excerpt: "", deleted: true },
        }),
      ),
    ).toBeNull();
  });

  it("根内容是碎语的评论点赞携带评论锚点跳转到碎语详情页", () => {
    const href = getLikedContentRootHref(
      makeItem({
        kind: "comment",
        filter: "comment",
        content: { id: 5, excerpt: "评论正文" },
        root: { kind: "moment", id: 30, excerpt: "碎语摘要" },
      }),
    );
    expect(href).toBe("/moments/30#comment-5");
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- liked-content-format.test.ts`
Expected: FAIL，前两条实际返回 `/moments`，第三条实际返回 `/moments`

- [ ] **Step 3: 实现**

将 `apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.ts` 第 53-58 行：

```ts
  if (item.kind === "moment") {
    if (item.content.deleted) {
      return null;
    }
    return "/moments";
  }
```

改为：

```ts
  if (item.kind === "moment") {
    if (item.content.deleted) {
      return null;
    }
    return `/moments/${item.content.id}`;
  }
```

将同文件第 75-77 行：

```ts
  if (root.kind === "moment") {
    return "/moments";
  }
```

改为：

```ts
  if (root.kind === "moment") {
    return `/moments/${root.id}${buildCommentAnchor(item.content.id)}`;
  }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- liked-content-format.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add "apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.ts" "apps/web/app/users/[id]/_components/profile-likes-tab/liked-content-format.test.ts"
git commit -m "fix(profile): 赞过碎语跳转到具体详情页"
```

---

## Task 9: 全量校验

**Files:** 无新改动，仅验证

- [ ] **Step 1: 全量类型检查**

Run: `pnpm --filter @repo/api --filter web check-types`
Expected: 无报错

- [ ] **Step 2: 全量 lint**

Run: `pnpm --filter @repo/api --filter web lint`
Expected: 无报错（0 warnings）

- [ ] **Step 3: 全量测试**

Run: `pnpm --filter @repo/api --filter web test`
Expected: 全部 PASS

- [ ] **Step 4: 若 Step 1-3 有失败，修复后重新提交对应 Task 的改动**

无需额外提交；若全部通过则本计划执行完毕。
