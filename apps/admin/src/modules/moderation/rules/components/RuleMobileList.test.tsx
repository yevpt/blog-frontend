import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RuleRow } from "../model";
import { RuleMobileList } from "./RuleMobileList";

const row: RuleRow = {
  id: 12,
  name: "礼貌用语",
  pattern: "谢谢",
  category: "other",
  categoryLabel: "其他",
  ruleType: "keyword",
  ruleTypeLabel: "关键词",
  effect: "review",
  effectLabel: "审核",
  riskLevel: "medium",
  riskLabel: "中风险",
  priority: 100,
  sourceId: 1,
  sourceLabel: "手工",
  active: true,
  activeLabel: "启用",
  updatedAt: "2026/06/30 08:00",
};

describe("RuleMobileList", () => {
  it("移动卡片使用统一的轻量操作并保留触控高度", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <RuleMobileList
        rows={[row]}
        isLoading={false}
        selectedIds={new Set()}
        togglingRuleId={null}
        isSubmitting={false}
        onToggleSelect={vi.fn()}
        onEdit={onEdit}
        onConfirmToggleActive={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("button", { name: "修改" })).toHaveClass(
      "text-muted-foreground",
      "h-8",
    );
    expect(screen.getByRole("button", { name: "停用" })).toHaveClass("text-destructive/80", "h-8");

    await user.click(screen.getByRole("button", { name: "修改" }));
    expect(onEdit).toHaveBeenCalledWith(row);
  });
});
