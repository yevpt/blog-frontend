import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { AdminModerationRuleMetadataResp, AdminModerationRulePageResp } from "@repo/api";
import { renderHookWithAdminRouter } from "../../../../test/render-with-admin-router";
import { useRuleList } from "./use-rule-list";
import { apiClient } from "../../../../lib/api";

vi.mock("../../../../lib/api", () => ({
  apiClient: {
    moderation: {
      rules: {
        list: vi.fn(),
        metadata: vi.fn(),
      },
    },
  },
}));

const mockMetadata: AdminModerationRuleMetadataResp = {
  categories: [{ key: "fraud", name: "欺诈" }],
  rule_types: ["keyword"],
  effects: ["review"],
  risk_levels: ["high"],
  sources: [{ id: 1, name: "手工" }],
};

const pageOne: AdminModerationRulePageResp = {
  list: [
    {
      id: 1,
      rule_type: "keyword",
      pattern: "a",
      category: "fraud",
      effect: "review",
      risk_level: "high",
      priority: 1,
      source_id: 1,
      activated_ruleset_id: 7,
      active: true,
      created_at: "2026-06-30T00:00:00Z",
      updated_at: "2026-06-30T00:00:00Z",
    },
    {
      id: 2,
      rule_type: "keyword",
      pattern: "b",
      category: "fraud",
      effect: "review",
      risk_level: "medium",
      priority: 2,
      source_id: 1,
      activated_ruleset_id: 7,
      active: true,
      created_at: "2026-06-30T00:00:00Z",
      updated_at: "2026-06-30T00:00:00Z",
    },
  ],
  next_cursor: 2,
  has_more: true,
};

const pageTwo: AdminModerationRulePageResp = {
  list: [
    {
      id: 3,
      rule_type: "keyword",
      pattern: "c",
      category: "fraud",
      effect: "review",
      risk_level: "low",
      priority: 3,
      source_id: 1,
      activated_ruleset_id: 7,
      active: true,
      created_at: "2026-06-30T00:00:00Z",
      updated_at: "2026-06-30T00:00:00Z",
    },
  ],
  next_cursor: 3,
  has_more: false,
};

describe("useRuleList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.rules.metadata).mockResolvedValue(mockMetadata);
    vi.mocked(apiClient.moderation.rules.list).mockResolvedValue(pageOne);
  });

  it("挂载后加载规则行", async () => {
    const { result } = renderHookWithAdminRouter(() => useRuleList());

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(apiClient.moderation.rules.list).toHaveBeenCalledWith({ limit: 50 });
    expect(result.current.rows[0]?.pattern).toBe("a");
  });

  it("筛选变化会清空游标栈并从第一批重新加载", async () => {
    const { result } = renderHookWithAdminRouter(() => useRuleList());
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    vi.mocked(apiClient.moderation.rules.list).mockResolvedValue(pageTwo);
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.canGoPrevious).toBe(true));

    act(() => result.current.setFilter("category", "fraud"));
    await waitFor(() => expect(result.current.filters.category).toBe("fraud"));
    await waitFor(() => {
      const lastArg = vi.mocked(apiClient.moderation.rules.list).mock.calls.at(-1)?.[0];
      expect(lastArg).toMatchObject({ category: "fraud" });
      expect(lastArg).not.toHaveProperty("cursor");
    });
    expect(result.current.canGoPrevious).toBe(false);
  });

  it("enabled=false 时不请求列表", async () => {
    renderHookWithAdminRouter(() => useRuleList(false));
    await act(async () => {
      await Promise.resolve();
    });
    expect(apiClient.moderation.rules.list).not.toHaveBeenCalled();
  });
});
