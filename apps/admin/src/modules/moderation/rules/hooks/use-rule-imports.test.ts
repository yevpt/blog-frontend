import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { AdminModerationImportResp } from "@repo/api";
import { renderHookWithAdminRouter } from "../../../../test/render-with-admin-router";
import { useRuleImports } from "./use-rule-imports";
import { apiClient } from "../../../../lib/api";

vi.mock("../../../../lib/api", () => ({
  apiClient: {
    moderation: {
      ruleImports: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        publish: vi.fn(),
        cancel: vi.fn(),
      },
    },
  },
}));

const activeTask: AdminModerationImportResp = {
  id: 9,
  file_name: "rules.csv",
  format: "csv",
  file_size: 100,
  source_id: 1,
  default_category: "other",
  default_effect: "review",
  default_risk_level: "medium",
  default_priority: 100,
  validation_status: "validating",
  total_rows: 0,
  valid_rows: 0,
  duplicate_rows: 0,
  error_rows: 0,
  operator_id: 1,
  created_at: "2026-06-30T00:00:00Z",
  updated_at: "2026-06-30T00:00:00Z",
};

function renderRuleImportsHook({ open }: { open: boolean }) {
  return renderHookWithAdminRouter(
    (props: { open: boolean }) =>
      useRuleImports({ open: props.open, currentRulesetId: 7, onPublished: vi.fn() }),
    { initialProps: { open } },
  );
}

describe("useRuleImports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.moderation.ruleImports.list).mockResolvedValue({
      list: [activeTask],
      next_cursor: 9,
      has_more: false,
    });
    vi.mocked(apiClient.moderation.ruleImports.get).mockResolvedValue(activeTask);
  });

  it("关闭并重新打开时从后端恢复活动任务", async () => {
    const { result, rerender } = renderRuleImportsHook({ open: true });
    await waitFor(() => expect(result.current.active?.id).toBe(9));
    rerender({ open: false });
    rerender({ open: true });
    await waitFor(() => expect(apiClient.moderation.ruleImports.get).toHaveBeenCalledWith(9));
  });
});
