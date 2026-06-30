import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithAdminRouter } from "../../../../test/render-with-admin-router";
import { useRuleTest } from "./use-rule-test";
import { apiClient } from "../../../../lib/api";

vi.mock("../../../../lib/api", () => ({
  apiClient: {
    moderation: {
      rules: {
        testText: vi.fn(),
      },
    },
  },
}));

describe("useRuleTest", () => {
  it("超长文本本地拦截", async () => {
    const { result } = renderHookWithAdminRouter(() =>
      useRuleTest({ currentRulesetId: 7, candidateReady: false }),
    );
    act(() => result.current.setText("x".repeat(10001)));
    await act(async () => {
      await result.current.runTest();
    });
    expect(apiClient.moderation.rules.testText).not.toHaveBeenCalled();
    expect(result.current.charLimitError).toBeTruthy();
  });

  it("候选就绪时提交候选规则集 ID", async () => {
    vi.mocked(apiClient.moderation.rules.testText).mockResolvedValue({
      risk: "high",
      ruleset_id: 8,
      rule_ids: [1],
      suppressed_ids: [],
      truncated: false,
      hits: [],
    });
    const { result } = renderHookWithAdminRouter(() =>
      useRuleTest({ currentRulesetId: 7, candidateRulesetId: 8, candidateReady: true }),
    );
    act(() => {
      result.current.setTarget("candidate");
      result.current.setText("测试");
    });
    await act(async () => {
      await result.current.runTest();
    });
    await waitFor(() =>
      expect(apiClient.moderation.rules.testText).toHaveBeenCalledWith({
        text: "测试",
        ruleset_id: 8,
      }),
    );
  });
});
