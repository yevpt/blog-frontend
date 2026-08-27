import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleTestDialog } from "./RuleTestDialog";
import { apiClient } from "../../../../lib/api";
import type { AdminModerationRuleStatusResp } from "@repo/api";

vi.mock("../../../../lib/api", () => ({
  apiClient: {
    moderation: {
      rules: {
        testText: vi.fn(),
      },
    },
  },
}));

function readyCandidateStatus(): AdminModerationRuleStatusResp {
  return {
    current_ruleset_id: 7,
    rule_count: 1,
    keyword_count: 1,
    regexp_count: 0,
    composite_count: 0,
    index_bytes: 1024,
    build_peak_bytes: 2048,
    build_duration_ms: 10,
    updated_at: "2026-06-30T00:00:00Z",
    candidate: {
      ruleset_id: 8,
      status: "ready",
      base_ruleset_id: 7,
      rule_count: 2,
      index_bytes: 1100,
      build_peak_bytes: 2200,
      created_at: "2026-06-30T00:00:00Z",
      updated_at: "2026-06-30T00:01:00Z",
    },
  };
}

describe("RuleTestDialog", () => {
  it("提交试跑并展示截断提示", async () => {
    vi.mocked(apiClient.moderation.rules.testText).mockResolvedValue({
      risk: "high",
      ruleset_id: 7,
      rule_ids: [1, 2],
      suppressed_ids: [],
      truncated: true,
      hits: [
        {
          rule_id: 1,
          rule_type: "keyword",
          pattern: "测",
          category: "other",
          effect: "review",
          risk_level: "high",
          excerpt: "测试内容",
        },
      ],
    });
    const user = userEvent.setup();
    render(<RuleTestDialog open status={readyCandidateStatus()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "审核规则文本试跑" });
    expect(within(dialog).getByRole("heading", { name: "文本试跑" }).closest("header")).toHaveClass(
      "px-4",
      "sm:px-6",
      "border-b",
    );
    expect(within(dialog).getByLabelText("测试文本")).toHaveClass("min-h-40", "shadow-xs");
    expect(dialog.querySelector("footer")).toHaveClass("border-t", "bg-muted/15");
    await user.type(screen.getByLabelText("测试文本"), "测试内容");
    await user.click(screen.getByRole("button", { name: "开始测试" }));
    expect(await screen.findByText("还有命中未展示")).toBeInTheDocument();
    await waitFor(() =>
      expect(apiClient.moderation.rules.testText).toHaveBeenCalledWith({ text: "测试内容" }),
    );
  });
});
