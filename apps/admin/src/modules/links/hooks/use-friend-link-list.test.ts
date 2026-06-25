import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFriendLinkList } from "./use-friend-link-list";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    friendLinks: {
      listAdmin: vi.fn(),
    },
  },
}));

describe("useFriendLinkList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("加载成功后返回友链行", async () => {
    vi.mocked(apiClient.friendLinks.listAdmin).mockResolvedValue({
      total: 1,
      pages: 1,
      page: 1,
      page_size: 50,
      list: [
        {
          id: 1,
          name: "VPT",
          site: "https://vpt.im",
          seq: 0,
          status: 1,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const { result } = renderHook(() => useFriendLinkList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rows).toEqual([
      expect.objectContaining({ id: "1", name: "VPT", site: "https://vpt.im" }),
    ]);
    expect(apiClient.friendLinks.listAdmin).toHaveBeenCalledWith({
      page: 1,
      page_size: 50,
    });
  });

  it("加载失败时返回 error", async () => {
    vi.mocked(apiClient.friendLinks.listAdmin).mockRejectedValue(new Error("网络错误"));

    const { result } = renderHook(() => useFriendLinkList());

    await waitFor(() => {
      expect(result.current.error?.message).toBe("网络错误");
    });
  });
});
