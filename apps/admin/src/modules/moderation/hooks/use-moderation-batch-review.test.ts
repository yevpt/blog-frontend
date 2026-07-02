import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ApiError } from "@repo/api";
import { useModerationBatchReview } from "./use-moderation-batch-review";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";
import type { ModerationRow } from "../model";
import type { UseModerationListResult } from "./use-moderation-list";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moderation: {
      approveItem: vi.fn(),
      rejectItem: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/toast", () => ({
  addToast: vi.fn(),
}));

const pendingRow: ModerationRow = {
  rowId: "100:200",
  itemId: 100,
  authorId: 42,
  lockVersion: 3,
  revisionId: 200,
  revisionVersion: 2,
  lifecycleState: "active",
  publicState: "placeholder",
  reviewStatus: "pending",
  riskLevel: "medium",
  policyAction: "post_review",
  contentTypeLabel: "碎语",
  contentType: "moment",
  riskLabel: "中风险",
  policyLabel: "审后通过",
  reviewLabel: "待审核",
  publicStateLabel: "占位",
  summary: "新提交内容",
  submittedContent: "新提交内容",
  publishedContent: "已发布内容",
  createdAt: "2026/06/29 16:00",
};

const deletedRow: ModerationRow = {
  ...pendingRow,
  rowId: "101:201",
  itemId: 101,
  revisionId: 201,
  lifecycleState: "deleted",
  summary: "已删除",
  submittedContent: "已删除",
};

function createList(overrides: Partial<UseModerationListResult> = {}): UseModerationListResult {
  return {
    rows: [pendingRow, deletedRow],
    pageData: { total: 2, page: 1, page_size: 10, list: [] },
    isLoading: false,
    error: null,
    page: 1,
    setPage: vi.fn(),
    filters: { contentType: "all", riskLevel: "all", reviewStatus: "pending", publicState: "all" },
    setContentType: vi.fn(),
    setRiskLevel: vi.fn(),
    setReviewStatus: vi.fn(),
    setPublicState: vi.fn(),
    resetListQuery: vi.fn(),
    hasActiveListQuery: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("useModerationBatchReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.approveItem).mockResolvedValue({
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 4,
      lifecycle_state: "active",
      public_state: "visible",
      revision_id: 200,
      revision_version: 2,
      submitted_content: "新提交内容",
      published_content: "新提交内容",
      risk_level: "medium",
      policy_action: "post_review",
      review_status: "approved",
      created_at: "2026-06-29T08:00:00Z",
      can_interact: true,
    });
    vi.mocked(apiClient.moderation.rejectItem).mockResolvedValue({
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 4,
      lifecycle_state: "active",
      public_state: "placeholder",
      revision_id: 200,
      revision_version: 2,
      submitted_content: "新提交内容",
      published_content: "已发布内容",
      risk_level: "medium",
      policy_action: "post_review",
      review_status: "rejected",
      created_at: "2026-06-29T08:00:00Z",
      can_interact: true,
    });
  });

  it("全选仅包含可批量审核的待审项", () => {
    const list = createList();
    const { result } = renderHook(() => useModerationBatchReview(list));

    act(() => {
      result.current.toggleSelectAll(true);
    });

    expect(result.current.selectedCount).toBe(1);
    expect(result.current.selectedRowIds.has("100:200")).toBe(true);
    expect(result.current.selectableCount).toBe(1);
  });

  it("批量通过逐条调用 approveItem 并刷新列表", async () => {
    const list = createList();
    const { result } = renderHook(() => useModerationBatchReview(list));

    act(() => {
      result.current.toggleSelect(pendingRow.rowId, true);
    });

    await act(async () => {
      await result.current.batchApprove();
    });

    expect(apiClient.moderation.approveItem).toHaveBeenCalledWith(100, {
      revision_id: 200,
      lock_version: 3,
      reason: "",
    });
    expect(list.refetch).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith("已通过 1 条", "success");
    expect(result.current.selectedCount).toBe(0);
  });

  it("批量驳回携带统一理由", async () => {
    const list = createList();
    const { result } = renderHook(() => useModerationBatchReview(list));

    act(() => {
      result.current.toggleSelect(pendingRow.rowId, true);
    });

    await act(async () => {
      await result.current.batchReject("内容不当");
    });

    expect(apiClient.moderation.rejectItem).toHaveBeenCalledWith(100, {
      revision_id: 200,
      lock_version: 3,
      reason: "内容不当",
    });
    expect(addToast).toHaveBeenCalledWith("已驳回 1 条", "success");
  });

  it("冲突错误计入失败并继续处理其余项", async () => {
    vi.mocked(apiClient.moderation.approveItem).mockRejectedValue(
      new ApiError("MODERATION_REVIEW_CONFLICT", "审核状态已经变化"),
    );
    const secondRow: ModerationRow = {
      ...pendingRow,
      rowId: "102:202",
      itemId: 102,
      revisionId: 202,
      lockVersion: 1,
    };
    const list = createList({ rows: [pendingRow, secondRow] });
    const { result } = renderHook(() => useModerationBatchReview(list));

    act(() => {
      result.current.toggleSelectAll(true);
    });

    await act(async () => {
      await result.current.batchApprove();
    });

    await waitFor(() => {
      expect(apiClient.moderation.approveItem).toHaveBeenCalledTimes(2);
    });
    expect(addToast).toHaveBeenCalledWith("通过失败，请刷新列表后重试", "error");
  });
});
