// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { MomentItemResp, MomentPageResp } from "@repo/api";
import { useMomentList } from "./use-moment-list";

const mockOpenLoginModal = vi.fn();
let mockSessionUserId: number | null = 7;

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: null }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: vi.fn(),
}));

function makeMoment(id: number, overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id,
    user_id: 1,
    content: `碎语 ${id}`,
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 3,
    comment_count: 1,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

function makePageResp(overrides: Partial<MomentPageResp> = {}): MomentPageResp {
  return {
    total: 1,
    pages: 1,
    page: 1,
    page_size: 20,
    list: [makeMoment(1)],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function getLastFetchUrl(): string {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  return String(call?.[0] ?? "");
}

describe("useMomentList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockSessionUserId = 7;
    mockOpenLoginModal.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("when active tab is friends, refresh after session change requests role_id", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(2)] })))
      .mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(2)] })));

    const { result, rerender } = renderHook(() =>
      useMomentList({ initialPage: makePageResp(), ownerUserId: 5, friendRoleId: 99 }),
    );

    await act(async () => {
      await result.current.changeTab("friends");
    });

    mockSessionUserId = 8;
    rerender();

    await waitFor(() => {
      const url = getLastFetchUrl();
      expect(url).toContain("role_id=99");
      expect(url).not.toContain("user_id=");
    });
  });

  it("when active tab is owner, refresh requests user_id", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(3)] })))
      .mockResolvedValueOnce(jsonResponse(makePageResp({ list: [makeMoment(3)] })));

    const { result, rerender } = renderHook(() =>
      useMomentList({ initialPage: makePageResp(), ownerUserId: 5, friendRoleId: 99 }),
    );

    await act(async () => {
      await result.current.changeTab("owner");
    });

    mockSessionUserId = 8;
    rerender();

    await waitFor(() => {
      const url = getLastFetchUrl();
      expect(url).toContain("user_id=5");
      expect(url).not.toContain("role_id=");
    });
  });

  it("when active tab is all, refresh requests neither user_id nor role_id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makePageResp()));

    const { rerender } = renderHook(() =>
      useMomentList({ initialPage: makePageResp(), ownerUserId: 5, friendRoleId: 99 }),
    );

    mockSessionUserId = 8;
    rerender();

    await waitFor(() => {
      const url = getLastFetchUrl();
      expect(url).toContain("/api/moments?");
      expect(url).not.toContain("user_id=");
      expect(url).not.toContain("role_id=");
    });
  });

  it("loadMore appends items and sets end state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        makePageResp({
          page: 2,
          pages: 2,
          list: [makeMoment(2)],
        }),
      ),
    );

    const { result } = renderHook(() =>
      useMomentList({
        initialPage: makePageResp({ total: 2, pages: 2, page: 1, list: [makeMoment(1)] }),
      }),
    );

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.moments).toHaveLength(2);
      expect(result.current.moments.map((item) => item.id)).toEqual([1, 2]);
      expect(result.current.endReached).toBe(true);
      expect(getLastFetchUrl()).toContain("page=2");
    });
  });

  it("failed load sets fetchError without dropping existing items", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500));

    const initialPage = makePageResp({ total: 2, pages: 2, page: 1, list: [makeMoment(1)] });
    const { result } = renderHook(() => useMomentList({ initialPage }));

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.fetchError).toBe(true);
      expect(result.current.moments).toEqual(initialPage.list);
      expect(result.current.endReached).toBe(false);
    });
  });
});
