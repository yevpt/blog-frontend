import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAdminArticleFilterOptions } from "./use-article-filter-options";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    categories: { listTabs: vi.fn() },
  },
}));

describe("useAdminArticleFilterOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.categories.listTabs).mockResolvedValue({
      list: [{ id: 1, name: "前端", seq: 0, article_count: 2 }],
    });
  });

  it("加载分类筛选项", async () => {
    const { result } = renderHook(() => useAdminArticleFilterOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categoryOptions).toEqual([
      { value: "all", label: "全部" },
      { value: "1", label: "前端" },
    ]);
    expect(result.current.error).toBeNull();
  });
});
