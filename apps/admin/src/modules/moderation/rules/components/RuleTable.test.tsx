import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RuleRow } from "../model";
import { RuleTable } from "./RuleTable";

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

describe("RuleTable", () => {
  it("将操作列靠右收口并复用轻量行内动作", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <RuleTable
        rows={[row]}
        isLoading={false}
        selectedIds={new Set()}
        togglingRuleId={null}
        isSubmitting={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onEdit={onEdit}
        onConfirmToggleActive={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const grid = screen.getByRole("grid", { name: "审核规则列表" });
    expect(within(grid).getByRole("columnheader", { name: "操作" })).toHaveClass("text-right");
    expect(within(grid).getByRole("button", { name: "修改" })).toHaveClass(
      "text-muted-foreground",
      "h-7",
    );
    expect(within(grid).getByRole("button", { name: "停用" })).toHaveClass("text-destructive/80");

    await user.click(within(grid).getByRole("button", { name: "修改" }));
    expect(onEdit).toHaveBeenCalledWith(row);
  });
});
