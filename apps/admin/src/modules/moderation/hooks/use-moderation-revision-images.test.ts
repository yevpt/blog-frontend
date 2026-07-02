import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useModerationRevisionImages } from "./use-moderation-revision-images";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moderation: {
      getHistory: vi.fn(),
    },
  },
}));

describe("useModerationRevisionImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("弹窗打开时拉取当前修订图片", async () => {
    vi.mocked(apiClient.moderation.getHistory).mockResolvedValue({
      total: 1,
      page: 1,
      page_size: 20,
      list: [
        {
          item_id: 100,
          subject: { type: "moment", id: 9 },
          author_id: 42,
          lock_version: 3,
          lifecycle_state: "active",
          public_state: "visible",
          revision_id: 200,
          revision_version: 1,
          submitted_content: "正文",
          published_content: "正文",
          risk_level: "medium",
          policy_action: "post_review",
          review_status: "pending",
          can_interact: true,
          created_at: "2026-06-29T08:00:00Z",
          images: [
            {
              seq: 0,
              object_key: "moments/9/a.jpg",
              access_url: "https://cdn.example.com/moments/9/a.jpg",
              display_mode: "pending",
              media_type: "image/jpeg",
              is_gif: false,
            },
          ],
        },
      ],
      events: [],
    });

    const { result } = renderHook(() =>
      useModerationRevisionImages({ open: true, itemId: 100, revisionId: 200 }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.images).toHaveLength(1);
    expect(result.current.images[0]?.access_url).toBe("https://cdn.example.com/moments/9/a.jpg");
  });

  it("open=false 时不请求", async () => {
    renderHook(() => useModerationRevisionImages({ open: false, itemId: 100, revisionId: 200 }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(apiClient.moderation.getHistory).not.toHaveBeenCalled();
  });
});
