import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useArticleEditorOptions } from "./use-article-editor-options";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    categories: { listTabs: vi.fn() },
    tags: { list: vi.fn() },
    music: { list: vi.fn() },
  },
}));

describe("useArticleEditorOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.categories.listTabs).mockResolvedValue({
      list: [{ id: 1, name: "前端", seq: 0, article_count: 2 }],
    });
    vi.mocked(apiClient.tags.list).mockResolvedValue({
      list: [{ id: 2, name: "React", seq: 0, article_count: 1 }],
    });
    vi.mocked(apiClient.music.list).mockResolvedValue({
      list: [
        {
          id: 3,
          name: "Quiet Rain",
          artist_display_name: "Paperroom",
          artists: [],
          album: { id: 1, name: "A" },
          album_track_no: 1,
          duration: 258,
          is_public: true,
          seq: 0,
        },
      ],
    });
  });

  it("加载分类、标签与音乐选项", async () => {
    const { result } = renderHook(() => useArticleEditorOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toHaveLength(1);
    expect(result.current.tags).toHaveLength(1);
    expect(result.current.musicList).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("加载失败时返回错误", async () => {
    vi.mocked(apiClient.categories.listTabs).mockRejectedValue(new Error("网络错误"));

    const { result } = renderHook(() => useArticleEditorOptions());

    await waitFor(() => {
      expect(result.current.error?.message).toBe("网络错误");
    });
  });
});
