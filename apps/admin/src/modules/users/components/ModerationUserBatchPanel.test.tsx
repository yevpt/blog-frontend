import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModerationUserBatchPanel } from "./ModerationUserBatchPanel";

it("恢复批次的继续操作仍调用恢复接口并携带 next_cursor", async () => {
  const onHideBatch = vi.fn().mockResolvedValue(undefined);
  const onRestoreBatch = vi.fn().mockResolvedValue(undefined);
  render(
    <ModerationUserBatchPanel
      batch={{ operation: "restore", processed: 8, next_cursor: 100, has_more: true }}
      isSaving={false}
      onHideBatch={onHideBatch}
      onRestoreBatch={onRestoreBatch}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: /继续下一批/ }));

  expect(onRestoreBatch).toHaveBeenCalledWith({ cursor: 100, reason: undefined });
  expect(onHideBatch).not.toHaveBeenCalled();
});
