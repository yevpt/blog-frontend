import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { useMusicCatalog } from "./use-music-catalog";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    music: {
      listAdmin: vi.fn(),
      listArtistsAdmin: vi.fn(),
      listAlbumsAdmin: vi.fn(),
      list: vi.fn(),
    },
  },
}));

describe("useMusicCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.music.listAdmin).mockResolvedValue({
      total: 1,
      list: [
        {
          id: 1,
          name: "Ref:rain",
          artist_display_name: "Aimer",
          artists: [{ id: 2, name: "Aimer", display_name: "Aimer" }],
          album_track_no: 1,
          duration: 270,
          is_public: true,
          seq: 0,
        },
      ],
    });
    vi.mocked(apiClient.music.listArtistsAdmin).mockResolvedValue({
      list: [{ id: 2, name: "Aimer", display_name: "Aimer" }],
    });
    vi.mocked(apiClient.music.listAlbumsAdmin).mockResolvedValue({
      list: [{ id: 3, name: "Album" }],
    });
    vi.mocked(apiClient.music.list).mockResolvedValue({ list: [] });
  });

  it("加载歌曲、歌手和专辑", async () => {
    const { result } = renderHook(() => useMusicCatalog());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows[0]?.name).toBe("Ref:rain");
    expect(result.current.artists).toHaveLength(1);
    expect(result.current.albums).toHaveLength(1);
    expect(apiClient.music.listAdmin).toHaveBeenCalledWith({ page: 1, page_size: 100 });
  });

  it("加载失败时返回错误", async () => {
    vi.mocked(apiClient.music.listAdmin).mockRejectedValue(new Error("加载失败"));

    const { result } = renderHook(() => useMusicCatalog());

    await waitFor(() => expect(result.current.error?.message).toBe("加载失败"));
  });

  it("管理端音乐接口不存在时降级读取公开旧列表", async () => {
    vi.mocked(apiClient.music.listAdmin).mockRejectedValue(new ApiError(404, "404 page not found"));
    vi.mocked(apiClient.music.list).mockResolvedValue({
      list: [
        {
          id: 9,
          name: "Protect You",
          singer: "Supper Moment",
          album: "Legacy",
          url: "https://cdn.example.com/protect.mp3",
          duration: 100,
          seq: 0,
        },
      ],
    });

    const { result } = renderHook(() => useMusicCatalog());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows[0]).toMatchObject({
      name: "Protect You",
      artistDisplayName: "Supper Moment",
      audioUrl: "https://cdn.example.com/protect.mp3",
      isPublic: true,
    });
    expect(result.current.artists).toEqual([]);
    expect(result.current.albums).toEqual([]);
  });
});
