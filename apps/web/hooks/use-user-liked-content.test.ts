// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { UserLikedContentPageResp } from "@repo/api";
import { useUserLikedContent } from "./use-user-liked-content";
import { buildUserLikedContentUrl } from "./use-user-liked-content.shared";

const mockApiJson = vi.fn();

vi.mock("@/lib/client-fetch", () => ({
  apiJson: (...args: unknown[]) => mockApiJson(...args),
}));

const page1: UserLikedContentPageResp = {
  total: 2,
  pages: 2,
  page: 1,
  page_size: 20,
  list: [
    {
      id: 1,
      liked_at: "2026-06-01T10:00:00Z",
      kind: "article",
      filter: "article",
      content: { id: 10, excerpt: "摘要", title: "标题" },
    },
  ],
};

const page2: UserLikedContentPageResp = {
  total: 2,
  pages: 2,
  page: 2,
  page_size: 20,
  list: [
    {
      id: 2,
      liked_at: "2026-06-02T10:00:00Z",
      kind: "moment",
      filter: "moment",
      content: { id: 3, excerpt: "碎语" },
    },
  ],
};

describe("buildUserLikedContentUrl", () => {
  it("构造带 type 的查询 URL", () => {
    const url = buildUserLikedContentUrl({
      userId: 5,
      page: 2,
      pageSize: 20,
      filter: "comment",
    });
    expect(url).toBe("/api/users/5/likes?page=2&page_size=20&type=comment");
  });

  it("全部筛选不传 type", () => {
    const url = buildUserLikedContentUrl({
      userId: 5,
      page: 1,
      pageSize: 20,
      filter: "all",
    });
    expect(url).toBe("/api/users/5/likes?page=1&page_size=20");
  });
});

describe("useUserLikedContent", () => {
  beforeEach(() => {
    mockApiJson.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("挂载后拉取第一页", async () => {
    mockApiJson.mockResolvedValue(page1);

    const { result } = renderHook(() => useUserLikedContent({ userId: 9 }));

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(mockApiJson).toHaveBeenCalledWith("/api/users/9/likes?page=1&page_size=20");
  });

  it("切换筛选重置列表", async () => {
    mockApiJson.mockImplementation((url: string) => {
      if (url.includes("type=article")) {
        return Promise.resolve({
          ...page1,
          list: [],
          total: 0,
          pages: 0,
        });
      }
      return Promise.resolve(page1);
    });

    const { result } = renderHook(() => useUserLikedContent({ userId: 9 }));

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    await act(async () => {
      await result.current.changeFilter("article");
    });

    await waitFor(() => {
      expect(result.current.filter).toBe("article");
      expect(result.current.items).toHaveLength(0);
    });

    expect(mockApiJson).toHaveBeenLastCalledWith(
      "/api/users/9/likes?page=1&page_size=20&type=article",
    );
  });

  it("loadMore 追加下一页", async () => {
    mockApiJson.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

    const { result } = renderHook(() => useUserLikedContent({ userId: 9 }));

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[1]?.id).toBe(2);
  });

  it("首屏失败进入 initialError", async () => {
    mockApiJson.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useUserLikedContent({ userId: 9 }));

    await waitFor(() => {
      expect(result.current.initialError).toBe(true);
    });
  });
});
