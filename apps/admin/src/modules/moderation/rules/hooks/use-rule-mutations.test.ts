import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { ApiError } from "@repo/api";
import { renderHookWithAdminRouter } from "../../../../test/render-with-admin-router";
import { useRuleMutations } from "./use-rule-mutations";
import { apiClient } from "../../../../lib/api";

vi.mock("../../../../lib/api", () => ({
  apiClient: {
    moderation: {
      rules: {
        create: vi.fn(),
        replace: vi.fn(),
        batchStatus: vi.fn(),
      },
    },
  },
}));

const onCompleted = vi.fn();

function validFormValues() {
  return {
    name: "",
    ruleType: "keyword" as const,
    pattern: "测试词",
    category: "other" as const,
    effect: "review" as const,
    riskLevel: "medium" as const,
    priority: "100",
    sourceId: "1",
  };
}

describe("useRuleMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.rules.replace).mockResolvedValue({
      ruleset_id: 8,
      base_ruleset_id: 7,
      status: "building",
    });
  });

  it("编辑提交携带当前规则集版本且不修改旧 ID", async () => {
    const { result } = renderHookWithAdminRouter(() =>
      useRuleMutations({ rulesetId: 7, onCompleted }),
    );
    await act(async () => {
      await result.current.replace(41, validFormValues());
    });
    expect(apiClient.moderation.rules.replace).toHaveBeenCalledWith(
      41,
      expect.objectContaining({ expected_ruleset_version: 7 }),
    );
  });

  it("版本冲突保留错误提示", async () => {
    vi.mocked(apiClient.moderation.rules.replace).mockRejectedValue(
      new ApiError("MODERATION_RULESET_CONFLICT", "版本已变化"),
    );
    const { result } = renderHookWithAdminRouter(() =>
      useRuleMutations({ rulesetId: 7, onCompleted }),
    );
    await act(async () => {
      await result.current.replace(41, validFormValues());
    });
    expect(result.current.conflictMessage).toContain("版本已变化");
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
