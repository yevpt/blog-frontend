import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { AdminModerationHistoryResp } from "@repo/api";
import { renderHookWithAdminRouter } from "../../../test/render-with-admin-router";
import { useModerationHistory } from "./use-moderation-history";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moderation: {
      getHistory: vi.fn(),
    },
  },
}));

const mockHistoryResp: AdminModerationHistoryResp = {
  total: 1,
  page: 1,
  page_size: 20,
  item_id: 100,
  revisions: [
    {
      revision_id: 200,
      revision_version: 1,
      submitted_content: "提交内容",
      published_content: "已发布内容",
      risk_level: "medium",
      policy_action: "post_review",
      review_status: "superseded",
      images: [
        {
          id: 1,
          name: "photo.jpg",
          file_type: "image/jpeg",
          access_url: "https://example.com/photo.jpg",
          display_mode: "original",
          seq: 0,
        },
      ],
      events: [
        {
          event_type: "submitted",
          operator_id: 42,
          operator_name: "用户A",
          created_at: "2026-06-29T08:00:00Z",
        },
      ],
      created_at: "2026-06-29T08:00:00Z",
    },
  ],
};

describe("useModerationHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("弹窗未打开或未选历史页签时不发请求", async () => {
    renderHookWithAdminRouter(() =>
      useModerationHistory({ open: false, activeTab: "history", itemId: 100 }),
    );

    await new Promise((r) => setTimeout(r, 20));
    expect(apiClient.moderation.getHistory).not.toHaveBeenCalled();
  });

  it("弹窗打开且选中历史页签时加载数据", async () => {
    vi.mocked(apiClient.moderation.getHistory).mockResolvedValue(mockHistoryResp);

    const { result } = renderHookWithAdminRouter(() =>
      useModerationHistory({ open: true, activeTab: "history", itemId: 100 }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.moderation.getHistory).toHaveBeenCalledWith(100, { page: 1 });
    expect(result.current.data?.revisions).toHaveLength(1);
    expect(result.current.data?.revisions[0]?.review_status).toBe("superseded");
    expect(result.current.data?.revisions[0]?.images).toHaveLength(1);
    expect(result.current.data?.revisions[0]?.images[0]?.access_url).toBe(
      "https://example.com/photo.jpg",
    );
  });

  it("当前内容页签不发请求", async () => {
    renderHookWithAdminRouter(() =>
      useModerationHistory({ open: true, activeTab: "current", itemId: 100 }),
    );

    await new Promise((r) => setTimeout(r, 20));
    expect(apiClient.moderation.getHistory).not.toHaveBeenCalled();
  });

  it("itemId 变化时重新加载", async () => {
    vi.mocked(apiClient.moderation.getHistory).mockResolvedValue(mockHistoryResp);

    const { result, rerender } = renderHookWithAdminRouter(
      ({ id }: { id: number }) =>
        useModerationHistory({ open: true, activeTab: "history", itemId: id }),
      { initialProps: { id: 100 } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    rerender({ id: 200 });

    await waitFor(() => {
      expect(apiClient.moderation.getHistory).toHaveBeenCalledWith(200, { page: 1 });
    });
  });

  it("setPage 翻页发起新请求", async () => {
    vi.mocked(apiClient.moderation.getHistory).mockResolvedValue(mockHistoryResp);

    const { result } = renderHookWithAdminRouter(() =>
      useModerationHistory({ open: true, activeTab: "history", itemId: 100 }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setPage(2);

    await waitFor(() => {
      expect(apiClient.moderation.getHistory).toHaveBeenLastCalledWith(100, { page: 2 });
    });
  });
});
