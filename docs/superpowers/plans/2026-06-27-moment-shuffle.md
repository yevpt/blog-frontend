# 首页碎语「换一批」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让首页碎语模块的「换一批」按钮真正生效：点击后从全站公开碎语池随机抽 3 条替换当前展示，并尽量不在同一次页面停留期间重复展示。

**Architecture:** 扩展现有 `GET /moments` 接口契约（`random` + `exclude_ids` 两个可选 query 参数，后端在独立 Go 仓库实现，本计划只产出前端契约对接代码）；前端经 `packages/api` 类型 + client 序列化 → `apps/web` BFF 路由透传 → 新增 `useMomentShuffle` hook（维护一个最近展示 ID 的滑动窗口）→ 接入 `MomentsSection` 按钮。

**Tech Stack:** TypeScript、Next.js App Router Route Handler、React hooks、Vitest + Testing Library（happy-dom，单测注解 `// @vitest-environment jsdom`）。

## Global Constraints

- 设计依据：[docs/superpowers/specs/2026-06-27-moment-shuffle-design.md](../specs/2026-06-27-moment-shuffle-design.md)，与该文档冲突时以文档为准。
- 禁止 `any`；类型不明确时用 `unknown` 或精确类型。
- 改动的 Hook/组件必须配套对应 `*.test.ts(x)`（项目强制要求，缺测视为未完成）。
- 「换一批」请求**不传 `user_id`**——抽样池是全站公开碎语，不限定博主本人。
- 滑动窗口（已展示 ID 记忆）上限 **30 条**（约 10 批），超出后丢弃最旧的；仅存于当前组件生命周期内存中，不做跨刷新持久化。
- 不改动 `/moments/feed`、`useMomentList` 内部分页逻辑；不新增区分「碎语来自其他用户」的 UI 文案。
- 后端 Go 服务不在本仓库，本计划不包含后端代码，后端契约已写入设计文档，需另行协调实现。
- 所有命令从仓库根目录运行；单测命令统一用 `pnpm test:run <文件路径>`（已验证可用：`vitest --run <文件路径>`，根 `vitest.config.ts` 为全仓库统一配置，无 workspace 分割）。

---

### Task 1: 扩展 `MomentListReq` 类型与 `moments.listPublic` 序列化

**Files:**
- Modify: `packages/api/src/types/moment.ts:1-6`
- Modify: `packages/api/src/client.ts:524-534`
- Test: `packages/api/src/client.test.ts`（在第 830 行 `moments.listPublic 带 user_id 时构造正确 query string` 测试后插入新测试，第 832 行 `moments.feed` 测试之前）

**Interfaces:**
- Produces: `MomentListReq.random?: boolean`、`MomentListReq.exclude_ids?: number[]`；`client.moments.listPublic(req)` 在 `req.random !== undefined` 时附加 `?random=true|false`，在 `req.exclude_ids` 非空数组时附加 `?exclude_ids=<逗号拼接的数字列表>`。

- [ ] **Step 1: 扩展类型定义**

修改 `packages/api/src/types/moment.ts` 第 1-6 行：

```ts
export interface MomentListReq {
  user_id?: number;
  role_id?: number;
  page?: number;
  page_size?: number;
  /** 随机抽样模式：忽略 page，从公开碎语池中随机抽 page_size 条 */
  random?: boolean;
  /** 随机模式下排除的碎语 ID，用于避免连续换一批时重复展示 */
  exclude_ids?: number[];
}
```

- [ ] **Step 2: 写失败的测试**

在 `packages/api/src/client.test.ts` 第 830 行（`moments.listPublic 带 user_id 时构造正确 query string` 测试结束的 `});` 之后）插入：

```ts
  it("moments.listPublic 带 random 和 exclude_ids 时构造正确 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 3, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.listPublic({ random: true, exclude_ids: [1, 2, 3], page_size: 3 });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/moments");
    expect(url.searchParams.get("random")).toBe("true");
    expect(url.searchParams.get("exclude_ids")).toBe("1,2,3");
  });

  it("moments.listPublic exclude_ids 为空数组时不附加该参数", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 3, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.listPublic({ random: true, exclude_ids: [] });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.searchParams.has("exclude_ids")).toBe(false);
  });
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `pnpm test:run packages/api/src/client.test.ts`
Expected: 新增的 2 个测试 FAIL（`url.searchParams.get("random")` 为 `null`，因为 `client.ts` 还没序列化这两个字段）。

- [ ] **Step 4: 实现 client.ts 序列化逻辑**

修改 `packages/api/src/client.ts` 第 524-534 行的 `listPublic`：

```ts
      listPublic: (req: MomentListReq = {}) => {
        const params = new URLSearchParams();
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        if (req.user_id !== undefined) params.set("user_id", String(req.user_id));
        if (req.role_id !== undefined) params.set("role_id", String(req.role_id));
        if (req.random !== undefined) params.set("random", String(req.random));
        if (req.exclude_ids !== undefined && req.exclude_ids.length > 0) {
          params.set("exclude_ids", req.exclude_ids.join(","));
        }
        const qs = params.toString();
        return fetchOptionalAuth<MomentPageResp>(`/moments${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test:run packages/api/src/client.test.ts`
Expected: 全部测试 PASS（含原有 78 个 + 新增 2 个）。

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/types/moment.ts packages/api/src/client.ts packages/api/src/client.test.ts
git commit -m "feat(api): moments.listPublic 支持 random/exclude_ids 随机抽样参数"
```

---

### Task 2: BFF 路由透传 `random`/`exclude_ids`

**Files:**
- Modify: `apps/web/app/api/moments/route.ts`
- Test: `apps/web/app/api/moments/route.test.ts`

**Interfaces:**
- Consumes: Task 1 产出的 `MomentListReq.random` / `MomentListReq.exclude_ids`。
- Produces: `GET /api/moments` 在收到 `?random=true&exclude_ids=1,2,3` 时，调用 `api.moments.listPublic({ ...其余字段, random: true, exclude_ids: [1,2,3] })`。

- [ ] **Step 1: 写失败的测试**

将 `apps/web/app/api/moments/route.test.ts` 整体替换为：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const proxyPostForm = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyPostForm: (...a: unknown[]) => proxyPostForm(...a) }));

const mockListPublic = vi.fn();
vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    moments: { listPublic: mockListPublic },
  }),
}));

import { GET, POST } from "./route";

describe("POST /api/moments", () => {
  it("委托给 proxyPostForm 转发到 /moments", async () => {
    proxyPostForm.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof POST>[0];
    await POST(req);
    expect(proxyPostForm).toHaveBeenCalledWith(req, "/moments");
  });
});

describe("GET /api/moments", () => {
  beforeEach(() => {
    mockListPublic.mockReset();
    mockListPublic.mockResolvedValue({ total: 0, pages: 0, page: 1, page_size: 10, list: [] });
  });

  it("透传 random 和 exclude_ids 到 api.moments.listPublic", async () => {
    const req = new NextRequest(
      "http://localhost/api/moments?random=true&exclude_ids=1,2,3&page_size=3",
    );
    await GET(req);

    expect(mockListPublic).toHaveBeenCalledWith({
      page_size: 3,
      random: true,
      exclude_ids: [1, 2, 3],
    });
  });

  it("缺少 random/exclude_ids 时不附加这两个字段", async () => {
    const req = new NextRequest("http://localhost/api/moments?user_id=1&page=1&page_size=3");
    await GET(req);

    expect(mockListPublic).toHaveBeenCalledWith({
      user_id: 1,
      page: 1,
      page_size: 3,
    });
  });

  it("exclude_ids 含非数字片段时过滤掉无效项", async () => {
    const req = new NextRequest("http://localhost/api/moments?random=true&exclude_ids=1,abc,3");
    await GET(req);

    expect(mockListPublic).toHaveBeenCalledWith({
      random: true,
      exclude_ids: [1, 3],
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test:run apps/web/app/api/moments/route.test.ts`
Expected: `GET /api/moments` 的 3 个测试 FAIL（实际调用参数中没有 `random`/`exclude_ids`）。

- [ ] **Step 3: 实现 route.ts 解析逻辑**

将 `apps/web/app/api/moments/route.ts` 的 `GET` 函数替换为：

```ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const req: MomentListReq = {};

    const page = searchParams.get("page");
    const pageSize = searchParams.get("page_size");
    const userId = searchParams.get("user_id");
    const roleId = searchParams.get("role_id");
    const random = searchParams.get("random");
    const excludeIds = searchParams.get("exclude_ids");

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const userIdNum = Number(userId);
    const roleIdNum = Number(roleId);

    if (page && !Number.isNaN(pageNum)) req.page = pageNum;
    if (pageSize && !Number.isNaN(pageSizeNum)) req.page_size = pageSizeNum;
    if (userId && !Number.isNaN(userIdNum)) req.user_id = userIdNum;
    if (roleId && !Number.isNaN(roleIdNum)) req.role_id = roleIdNum;
    if (random === "true") req.random = true;
    if (excludeIds) {
      const ids = excludeIds
        .split(",")
        .map(Number)
        .filter((id) => !Number.isNaN(id));
      if (ids.length > 0) req.exclude_ids = ids;
    }

    const api = await createServerApiClient();
    const data = await api.moments.listPublic(req);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch moments" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test:run apps/web/app/api/moments/route.test.ts`
Expected: 全部 4 个测试 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/moments/route.ts apps/web/app/api/moments/route.test.ts
git commit -m "feat(api): /api/moments 透传 random/exclude_ids 查询参数"
```

---

### Task 3: 新增 `useMomentShuffle` hook

**Files:**
- Create: `apps/web/hooks/use-moment-shuffle.ts`
- Test: Create `apps/web/hooks/use-moment-shuffle.test.ts`

**Interfaces:**
- Consumes: `apiJson`、`getApiErrorMessage`（`@/lib/client-fetch`）；`addToast`（`@/lib/toast`）；`buildQuery`（`@/lib/query`）；`MomentItemResp`、`MomentPageResp`（`@repo/api`）。
- Produces: `useMomentShuffle({ pageSize: number; initialMomentIds: number[]; onShuffled: (list: MomentItemResp[]) => void }): { shuffle: () => Promise<void>; isShuffling: boolean }`。供 Task 4 的 `MomentsSection` 使用。

- [ ] **Step 1: 写失败的测试**

创建 `apps/web/hooks/use-moment-shuffle.test.ts`：

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { MomentItemResp } from "@repo/api";
import { useMomentShuffle } from "./use-moment-shuffle";

const mockAddToast = vi.hoisted(() => vi.fn());

vi.mock("@/lib/toast", () => ({
  addToast: mockAddToast,
}));

function makeMoment(id: number): MomentItemResp {
  return {
    id,
    user_id: 1,
    content: `碎语 ${id}`,
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 0,
    comment_count: 0,
    is_liked: false,
    images: [],
    created_at: "2026-06-27T09:00:00Z",
    updated_at: "2026-06-27T09:00:00Z",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function getLastFetchUrl(): URL {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  return new URL(String(call?.[0] ?? ""), "http://localhost");
}

describe("useMomentShuffle", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockAddToast.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("首次调用时用初始碎语 ID 作为 exclude_ids，不带 user_id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ total: 5, pages: 1, page: 1, page_size: 3, list: [makeMoment(10)] }),
    );
    const onShuffled = vi.fn();
    const { result } = renderHook(() =>
      useMomentShuffle({ pageSize: 3, initialMomentIds: [1, 2, 3], onShuffled }),
    );

    await act(async () => {
      await result.current.shuffle();
    });

    const url = getLastFetchUrl();
    expect(url.pathname).toBe("/api/moments");
    expect(url.searchParams.get("random")).toBe("true");
    expect(url.searchParams.get("exclude_ids")).toBe("1,2,3");
    expect(url.searchParams.get("page_size")).toBe("3");
    expect(url.searchParams.has("user_id")).toBe(false);
    expect(onShuffled).toHaveBeenCalledWith([makeMoment(10)]);
  });

  it("连续调用会把新展示的 ID 并入窗口，下一次请求带上累计的 exclude_ids", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ total: 5, pages: 1, page: 1, page_size: 3, list: [makeMoment(10)] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ total: 5, pages: 1, page: 1, page_size: 3, list: [makeMoment(20)] }),
      );
    const onShuffled = vi.fn();
    const { result } = renderHook(() =>
      useMomentShuffle({ pageSize: 3, initialMomentIds: [1], onShuffled }),
    );

    await act(async () => {
      await result.current.shuffle();
    });
    await act(async () => {
      await result.current.shuffle();
    });

    const url = getLastFetchUrl();
    expect(url.searchParams.get("exclude_ids")).toBe("1,10");
  });

  it("窗口超过 30 条时丢弃最旧的 ID", async () => {
    const initialIds = Array.from({ length: 30 }, (_, i) => i + 1);
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ total: 100, pages: 1, page: 1, page_size: 3, list: [makeMoment(999)] }),
    );
    const onShuffled = vi.fn();
    const { result } = renderHook(() =>
      useMomentShuffle({ pageSize: 3, initialMomentIds: initialIds, onShuffled }),
    );

    await act(async () => {
      await result.current.shuffle();
    });

    const firstUrl = getLastFetchUrl();
    expect(firstUrl.searchParams.get("exclude_ids")).toBe(initialIds.join(","));

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ total: 100, pages: 1, page: 1, page_size: 3, list: [makeMoment(998)] }),
    );
    await act(async () => {
      await result.current.shuffle();
    });

    const secondUrl = getLastFetchUrl();
    const ids = secondUrl.searchParams.get("exclude_ids")?.split(",").map(Number);
    expect(ids).not.toContain(1);
    expect(ids).toContain(999);
    expect(ids?.length).toBe(30);
  });

  it("请求失败时 toast 展示兜底文案，不调用 onShuffled", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const onShuffled = vi.fn();
    const { result } = renderHook(() =>
      useMomentShuffle({ pageSize: 3, initialMomentIds: [1], onShuffled }),
    );

    await act(async () => {
      await result.current.shuffle();
    });

    expect(mockAddToast).toHaveBeenCalledWith("换一批失败，请稍后重试", "error");
    expect(onShuffled).not.toHaveBeenCalled();
  });

  it("请求进行中 isShuffling 为 true，完成后恢复 false", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useMomentShuffle({ pageSize: 3, initialMomentIds: [1], onShuffled: vi.fn() }),
    );

    act(() => {
      void result.current.shuffle();
    });

    await waitFor(() => {
      expect(result.current.isShuffling).toBe(true);
    });

    await act(async () => {
      resolveFetch(jsonResponse({ total: 5, pages: 1, page: 1, page_size: 3, list: [] }));
    });

    await waitFor(() => {
      expect(result.current.isShuffling).toBe(false);
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test:run apps/web/hooks/use-moment-shuffle.test.ts`
Expected: FAIL，报错 `Cannot find module './use-moment-shuffle'`（文件还不存在）。

- [ ] **Step 3: 实现 hook**

创建 `apps/web/hooks/use-moment-shuffle.ts`：

```ts
"use client";

import { useCallback, useRef, useState } from "react";
import type { MomentItemResp, MomentPageResp } from "@repo/api";
import { addToast } from "@/lib/toast";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";

/** 已展示 ID 滑动窗口上限：约 10 批（每批 3 条），超出后丢弃最旧的，避免 URL 无限增长 */
const MAX_TRACKED_SHOWN_IDS = 30;

export interface UseMomentShuffleOptions {
  pageSize: number;
  /** 首屏已展示的碎语 ID，作为窗口初始值，避免第一次换一批就摸到首屏内容 */
  initialMomentIds: number[];
  onShuffled: (list: MomentItemResp[]) => void;
}

/** 首页碎语「换一批」：从全站公开碎语池随机抽样，尽量不重复展示最近出现过的内容 */
export function useMomentShuffle({
  pageSize,
  initialMomentIds,
  onShuffled,
}: UseMomentShuffleOptions) {
  const shownIdsRef = useRef<number[]>(initialMomentIds);
  const isShufflingRef = useRef(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const shuffle = useCallback(async () => {
    if (isShufflingRef.current) return;

    isShufflingRef.current = true;
    setIsShuffling(true);
    try {
      const qs = buildQuery({
        page_size: pageSize,
        random: true,
        exclude_ids: shownIdsRef.current.join(","),
      });
      const data = await apiJson<MomentPageResp>(`/api/moments?${qs}`);
      shownIdsRef.current = [
        ...shownIdsRef.current,
        ...data.list.map((moment) => moment.id),
      ].slice(-MAX_TRACKED_SHOWN_IDS);
      onShuffled(data.list);
    } catch (err) {
      addToast(getApiErrorMessage(err, "换一批失败，请稍后重试"), "error");
    } finally {
      isShufflingRef.current = false;
      setIsShuffling(false);
    }
  }, [onShuffled, pageSize]);

  return { shuffle, isShuffling };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test:run apps/web/hooks/use-moment-shuffle.test.ts`
Expected: 全部 5 个测试 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-moment-shuffle.ts apps/web/hooks/use-moment-shuffle.test.ts
git commit -m "feat(moments): 新增 useMomentShuffle 随机抽样去重 hook"
```

---

### Task 4: 接入 `MomentsSection`——按钮绑定真实行为

**Files:**
- Modify: `apps/web/components/moments/moments-section.tsx`
- Modify: `apps/web/components/moments/moments-section.test.tsx`

**Interfaces:**
- Consumes: Task 3 产出的 `useMomentShuffle({ pageSize, initialMomentIds, onShuffled }): { shuffle, isShuffling }`；`useMomentList` 已导出的 `setMoments`（现有代码，无需改动签名）。

- [ ] **Step 1: 写失败的测试**

在 `apps/web/components/moments/moments-section.test.tsx` 中，文件最后一个 `it(...)` 块结束（第 370 行 `});`）之后、`describe` 收尾的 `});`（第 371 行，文件最后一行）之前插入：

```tsx
  it("点击换一批会请求随机碎语并替换卡片，exclude_ids 携带当前已展示的碎语 ID", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        total: 10,
        pages: 1,
        page: 1,
        page_size: 3,
        list: [makeMoment(101, "换一批换出来的碎语")],
      }),
    );

    render(
      <MomentsSection
        initialMoments={[makeMoment(1, SHORT_CONTENT), makeMoment(2, LONG_CONTENT)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /换一批/ }));

    await waitFor(() => {
      expect(screen.getByText("换一批换出来的碎语")).toBeTruthy();
    });
    expect(screen.queryByText(SHORT_CONTENT)).toBeNull();

    const calledUrl = vi.mocked(fetch).mock.calls.at(-1)?.[0] as string;
    const url = new URL(calledUrl, "http://localhost");
    expect(url.pathname).toBe("/api/moments");
    expect(url.searchParams.get("random")).toBe("true");
    expect(url.searchParams.get("exclude_ids")).toBe("1,2");
    expect(url.searchParams.get("page_size")).toBe("3");
    expect(url.searchParams.has("user_id")).toBe(false);
  });

  it("换一批请求进行中按钮禁用，请求完成后恢复可点击", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<MomentsSection initialMoments={[makeMoment(1, SHORT_CONTENT)]} />);

    const shuffleButton = screen.getByRole("button", { name: /换一批/ });
    await user.click(shuffleButton);

    expect(shuffleButton).toBeDisabled();

    await act(async () => {
      resolveFetch(jsonResponse({ total: 1, pages: 1, page: 1, page_size: 3, list: [] }));
    });

    await waitFor(() => {
      expect(shuffleButton).not.toBeDisabled();
    });
  });

  it("换一批失败时 toast 展示兜底文案，不改变已展示内容", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<MomentsSection initialMoments={[makeMoment(1, SHORT_CONTENT)]} />);

    await user.click(screen.getByRole("button", { name: /换一批/ }));

    await waitFor(() => {
      expect(toastMockState.addToast).toHaveBeenCalledWith("换一批失败，请稍后重试", "error");
    });
    expect(screen.getByText(SHORT_CONTENT)).toBeTruthy();
  });
```

同时把文件第 2 行 `import { render, screen, waitFor } from "@testing-library/react";` 改为补充 `act`：

```tsx
import { render, screen, waitFor, act } from "@testing-library/react";
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test:run apps/web/components/moments/moments-section.test.tsx`
Expected: 新增的 3 个测试 FAIL（按钮没有绑定 `onPress`，点击无任何 fetch 调用）。

- [ ] **Step 3: 实现组件改动**

修改 `apps/web/components/moments/moments-section.tsx`：

在 import 区（第 15 行 `import { useMomentList } from "@/hooks/use-moment-list";` 之后）新增：

```tsx
import { useMomentShuffle } from "@/hooks/use-moment-shuffle";
```

在 `useMomentList(...)` 调用结束之后（原第 61 行 `});` 之后，`const [activeComment, ...` 之前）新增：

```tsx
  const { shuffle, isShuffling } = useMomentShuffle({
    pageSize: MAX_MOMENTS,
    initialMomentIds: initialMoments.map((moment) => moment.id),
    onShuffled: setMoments,
  });
```

将原第 101-104 行的按钮替换为：

```tsx
            <SidebarSectionAction
              aria-label={t("moment.shuffle")}
              onPress={shuffle}
              isDisabled={isShuffling}
            >
              <SvgIcon
                name="refresh-cw"
                size={12}
                className={isShuffling ? "animate-spin" : undefined}
              />
              {t("moment.shuffle")}
            </SidebarSectionAction>
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test:run apps/web/components/moments/moments-section.test.tsx`
Expected: 全部测试 PASS（原有 17 个 + 新增 3 个）。

- [ ] **Step 5: 跑相关测试与类型/lint 检查，确认无回归**

Run:
```bash
pnpm test:run apps/web/components/moments/moments-section.test.tsx apps/web/hooks/use-moment-shuffle.test.ts apps/web/hooks/use-moment-list.test.ts apps/web/app/api/moments/route.test.ts packages/api/src/client.test.ts
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
```
Expected: 全部 PASS / 0 error / 0 warning。

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/moments/moments-section.tsx apps/web/components/moments/moments-section.test.tsx
git commit -m "feat(moments): 首页碎语接入换一批随机抽样"
```
