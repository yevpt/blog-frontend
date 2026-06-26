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
