import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTagList } from "./use-tag-list";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    tags: {
      list: vi.fn(),
    },
  },
}));

describe("useTagList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("加载成功后返回标签行", async () => {
    vi.mocked(apiClient.tags.list).mockResolvedValue({
      list: [
        {
          id: 1,
          name: "Go",
          seq: 0,
          article_count: 3,
        },
      ],
    });

    const { result } = renderHook(() => useTagList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rows).toEqual([
      expect.objectContaining({ id: "1", name: "Go", articleCount: 3 }),
    ]);
  });

  it("加载失败时返回 error", async () => {
    vi.mocked(apiClient.tags.list).mockRejectedValue(new Error("网络错误"));

    const { result } = renderHook(() => useTagList());

    await waitFor(() => {
      expect(result.current.error?.message).toBe("网络错误");
    });
  });

  it("refetch 会重新请求列表", async () => {
    vi.mocked(apiClient.tags.list)
      .mockResolvedValueOnce({ list: [{ id: 1, name: "A", seq: 0, article_count: 0 }] })
      .mockResolvedValueOnce({ list: [{ id: 2, name: "B", seq: 1, article_count: 1 }] });

    const { result } = renderHook(() => useTagList());

    await waitFor(() => {
      expect(result.current.rows[0]?.name).toBe("A");
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.rows[0]?.name).toBe("B");
    });

    expect(apiClient.tags.list).toHaveBeenCalledTimes(2);
  });
});
