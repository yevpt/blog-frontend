import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleFormDialog } from "./RuleFormDialog";
import type { AdminModerationRuleMetadataResp } from "@repo/api";

const metadata: AdminModerationRuleMetadataResp = {
  categories: [{ key: "other", name: "其他" }],
  rule_types: ["keyword"],
  effects: ["review", "allow"],
  risk_levels: ["medium"],
  sources: [{ id: 1, name: "手工" }],
};

describe("RuleFormDialog", () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("版本冲突时保持弹窗打开并展示提示", async () => {
    const user = userEvent.setup();
    const conflictSubmit = vi.fn().mockResolvedValue(false);
    render(
      <RuleFormDialog
        mode="create"
        open
        row={null}
        metadata={metadata}
        isSubmitting={false}
        conflictMessage="规则集版本已变化，请刷新状态后重试。"
        onClose={onClose}
        onSubmit={conflictSubmit}
      />,
    );

    expect(screen.getByText(/版本已变化/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("匹配内容"), "测试词");
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() => expect(conflictSubmit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("白名单在非关键词类型时展示校验错误", async () => {
    const user = userEvent.setup();
    render(
      <RuleFormDialog
        mode="create"
        open
        row={null}
        metadata={metadata}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() => expect(screen.getByText("请输入匹配内容")).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
