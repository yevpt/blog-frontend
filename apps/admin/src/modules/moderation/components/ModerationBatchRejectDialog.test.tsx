import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModerationBatchRejectDialog } from "./ModerationBatchRejectDialog";

describe("ModerationBatchRejectDialog", () => {
  it("渲染分层弹窗并校验驳回理由", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ModerationBatchRejectDialog
        open
        selectedCount={3}
        isSaving={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "批量驳回" });
    expect(
      within(dialog).getByText("将为所选 3 条待审内容应用同一条驳回理由。"),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("批量驳回理由")).toHaveClass("min-h-32", "shadow-xs");
    expect(dialog.querySelector("footer")).toHaveClass("border-t", "bg-muted/15");

    await user.click(within(dialog).getByRole("button", { name: "确认驳回" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("驳回必须填写理由");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("批量驳回理由"), "需要补充来源说明");
    await user.click(within(dialog).getByRole("button", { name: "确认驳回" }));
    expect(onSubmit).toHaveBeenCalledWith("需要补充来源说明");
  });
});
