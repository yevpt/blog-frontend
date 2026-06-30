import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleToggleActiveButton } from "./RuleToggleActiveButton";
import type { RuleRow } from "../model";

const row: RuleRow = {
  id: 12,
  name: "",
  pattern: "测试词",
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

describe("RuleToggleActiveButton", () => {
  const onConfirm = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("点击后展示 Popover 确认浮层", async () => {
    const user = userEvent.setup();
    render(<RuleToggleActiveButton row={row} isSubmitting={false} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "停用" }));
    expect(screen.getByRole("dialog", { name: "确认停用规则 #12" })).toBeInTheDocument();
    expect(screen.getByText(/确定停用规则 #12/)).toBeInTheDocument();
  });

  it("确认后调用 onConfirm", async () => {
    const user = userEvent.setup();
    render(<RuleToggleActiveButton row={row} isSubmitting={false} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "停用" }));
    const dialog = screen.getByRole("dialog", { name: "确认停用规则 #12" });
    await user.click(within(dialog).getByRole("button", { name: "停用" }));
    expect(onConfirm).toHaveBeenCalledWith(row);
  });
});
