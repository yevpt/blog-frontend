import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { AdminModerationPageResp } from "@repo/api";
import { renderHookWithAdminRouter } from "../../../test/render-with-admin-router";
import { useModerationList } from "./use-moderation-list";
import { apiClient } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moderation: {
      listItems: vi.fn(),
    },
  },
}));

const mockPage: AdminModerationPageResp = {
  total: 1,
  page: 1,
  page_size: 10,
  list: [
    {
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 3,
      lifecycle_state: "active",
      public_state: "placeholder",
      revision_id: 200,
      revision_version: 2,
      submitted_content: "新内容",
      published_content: "已发布",
      risk_level: "medium",
      policy_action: "post_review",
      review_status: "pending",
      created_at: "2026-06-29T08:00:00Z",
      can_interact: true,
    },
  ],
};

describe("useModerationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.listItems).mockResolvedValue(mockPage);
  });

  it("挂载后默认按 review_status=pending 请求并映射表格行", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.moderation.listItems).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      review_status: "pending",
    });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]?.itemId).toBe(100);
    expect(result.current.rows[0]?.contentTypeLabel).toBe("碎语");
    expect(result.current.error).toBeNull();
  });

  it("从 URL 恢复非默认筛选", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationList(), {
      initialEntry:
        "/moderation?page=2&content_type=guestbook&risk_level=high&review_status=approved",
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.page).toBe(2);
    expect(result.current.filters).toEqual({
      contentType: "guestbook",
      riskLevel: "high",
      reviewStatus: "approved",
      publicState: "all",
    });

    expect(apiClient.moderation.listItems).toHaveBeenLastCalledWith({
      page: 2,
      page_size: 10,
      content_type: "guestbook",
      risk_level: "high",
      review_status: "approved",
    });
  });

  it("setContentType / setRiskLevel / setReviewStatus 重置到首页并更新筛选", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationList(), {
      initialEntry: "/moderation?page=3",
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setContentType("moment");
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
      expect(result.current.filters.contentType).toBe("moment");
    });

    act(() => {
      result.current.setRiskLevel("high");
    });

    await waitFor(() => {
      expect(result.current.filters.riskLevel).toBe("high");
    });

    act(() => {
      result.current.setReviewStatus("approved");
    });

    await waitFor(() => {
      expect(result.current.filters.reviewStatus).toBe("approved");
    });

    expect(apiClient.moderation.listItems).toHaveBeenLastCalledWith({
      page: 1,
      page_size: 10,
      content_type: "moment",
      risk_level: "high",
      review_status: "approved",
    });
  });

  it("setReviewStatus=all 时传 review_status=all", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setReviewStatus("all");
    });

    await waitFor(() => {
      expect(apiClient.moderation.listItems).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        review_status: "all",
      });
    });
  });

  it("setPage 翻页", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(apiClient.moderation.listItems).toHaveBeenLastCalledWith({
        page: 2,
        page_size: 10,
        review_status: "pending",
      });
    });
  });

  it("resetListQuery 清空非默认筛选", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationList(), {
      initialEntry: "/moderation?page=2&content_type=moment",
    });

    await waitFor(() => {
      expect(result.current.hasActiveListQuery).toBe(true);
    });

    act(() => {
      result.current.resetListQuery();
    });

    await waitFor(() => {
      expect(result.current.hasActiveListQuery).toBe(false);
      expect(result.current.filters).toEqual({
        contentType: "all",
        riskLevel: "all",
        reviewStatus: "pending",
        publicState: "all",
      });
    });
  });

  it("refetch 触发重新加载", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const callsBefore = vi.mocked(apiClient.moderation.listItems).mock.calls.length;
    act(() => {
      void result.current.refetch();
    });

    await waitFor(() => {
      expect(vi.mocked(apiClient.moderation.listItems).mock.calls.length).toBeGreaterThan(
        callsBefore,
      );
    });
  });

  it("请求失败暴露 error", async () => {
    vi.mocked(apiClient.moderation.listItems).mockRejectedValue(new Error("网络错误"));

    const { result } = renderHookWithAdminRouter(() => useModerationList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("网络错误");
    expect(result.current.rows).toEqual([]);
  });

  it("rows 使用 itemId:revisionId 作为复合行标识", async () => {
    const { result } = renderHookWithAdminRouter(() => useModerationList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // item_id=100, revision_id=200 → rowId="100:200"
    expect(result.current.rows[0]?.rowId).toBe("100:200");
  });

  it("refetch 返回的 Promise 在 HTTP 请求完成后 resolve", async () => {
    let resolveHttp!: (value: AdminModerationPageResp) => void;
    vi.mocked(apiClient.moderation.listItems).mockImplementationOnce(
      () =>
        new Promise<AdminModerationPageResp>((res) => {
          resolveHttp = res;
        }),
    );

    const { result } = renderHookWithAdminRouter(() => useModerationList());

    // 等第一次加载
    resolveHttp(mockPage);
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 第二次请求挂起
    let resolveHttp2!: (value: AdminModerationPageResp) => void;
    vi.mocked(apiClient.moderation.listItems).mockImplementationOnce(
      () =>
        new Promise<AdminModerationPageResp>((res) => {
          resolveHttp2 = res;
        }),
    );

    let refetchResolved = false;
    act(() => {
      void result.current.refetch().then(() => {
        refetchResolved = true;
      });
    });

    // HTTP 未完成，Promise 不应 resolve
    await new Promise((r) => setTimeout(r, 10));
    expect(refetchResolved).toBe(false);

    // 完成 HTTP 请求
    resolveHttp2(mockPage);
    await waitFor(() => {
      expect(refetchResolved).toBe(true);
    });
  });
});
