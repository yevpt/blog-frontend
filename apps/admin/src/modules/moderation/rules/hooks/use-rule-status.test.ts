import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { AdminModerationRuleMetadataResp, AdminModerationRuleStatusResp } from "@repo/api";
import { renderHookWithAdminRouter } from "../../../../test/render-with-admin-router";
import { useRuleStatus } from "./use-rule-status";
import { apiClient } from "../../../../lib/api";

vi.mock("../../../../lib/api", () => ({
  apiClient: {
    moderation: {
      rules: {
        status: vi.fn(),
        metadata: vi.fn(),
      },
    },
  },
}));

const mockStatus: AdminModerationRuleStatusResp = {
  current_ruleset_id: 7,
  rule_count: 100,
  keyword_count: 90,
  regexp_count: 5,
  composite_count: 5,
  index_bytes: 1024,
  build_peak_bytes: 2048,
  build_duration_ms: 100,
  updated_at: "2026-06-30T00:00:00Z",
};

const mockMetadata: AdminModerationRuleMetadataResp = {
  categories: [],
  rule_types: ["keyword"],
  effects: ["review"],
  risk_levels: ["medium"],
  sources: [],
};

describe("useRuleStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.rules.status).mockResolvedValue(mockStatus);
    vi.mocked(apiClient.moderation.rules.metadata).mockResolvedValue(mockMetadata);
  });

  it("挂载后加载状态与元数据", async () => {
    const { result } = renderHookWithAdminRouter(() => useRuleStatus());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status?.current_ruleset_id).toBe(7);
    expect(result.current.metadata).toEqual(mockMetadata);
  });

  it("reload 可重新请求状态", async () => {
    const { result } = renderHookWithAdminRouter(() => useRuleStatus());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.reload());
    await waitFor(() => expect(apiClient.moderation.rules.status).toHaveBeenCalledTimes(2));
  });
});
