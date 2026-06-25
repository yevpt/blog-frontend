import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCategoryList } from "./use-category-list";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    categories: {
      listTabs: vi.fn(),
    },
  },
}));

describe("useCategoryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("加载成功后返回分类行", async () => {
    vi.mocked(apiClient.categories.listTabs).mockResolvedValue({
      list: [
        {
          id: 1,
          name: "编程",
          seq: 0,
          article_count: 3,
        },
      ],
    });

    const { result } = renderHook(() => useCategoryList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rows).toEqual([
      expect.objectContaining({ id: "1", name: "编程", articleCount: 3 }),
    ]);
  });

  it("加载失败时返回 error", async () => {
    vi.mocked(apiClient.categories.listTabs).mockRejectedValue(new Error("网络错误"));

    const { result } = renderHook(() => useCategoryList());

    await waitFor(() => {
      expect(result.current.error?.message).toBe("网络错误");
    });
  });

  it("refetch 会重新请求列表", async () => {
    vi.mocked(apiClient.categories.listTabs)
      .mockResolvedValueOnce({ list: [{ id: 1, name: "A", seq: 0, article_count: 0 }] })
      .mockResolvedValueOnce({ list: [{ id: 2, name: "B", seq: 1, article_count: 1 }] });

    const { result } = renderHook(() => useCategoryList());

    await waitFor(() => {
      expect(result.current.rows[0]?.name).toBe("A");
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.rows[0]?.name).toBe("B");
    });

    expect(apiClient.categories.listTabs).toHaveBeenCalledTimes(2);
  });
});
