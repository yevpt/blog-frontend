import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminModerationProfileResp } from "@repo/api";
import { ModerationUserPanel } from "./ModerationUserPanel";

const profile: AdminModerationProfileResp = {
  user_id: 42,
  trust_level: "normal",
  trust_source: "auto",
  manual_trust_locked: false,
  sanction_state: "active",
  clean_approval_streak: 3,
  corrected_count: 0,
  rejected_count: 0,
  high_risk_count: 0,
  violation_score: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-06-29T00:00:00Z",
};

it("恢复批次的继续操作仍调用恢复接口并携带 next_cursor", async () => {
  const onHideBatch = vi.fn().mockResolvedValue(undefined);
  const onRestoreBatch = vi.fn().mockResolvedValue(undefined);
  render(
    <ModerationUserPanel
      profile={profile}
      batch={{ operation: "restore", processed: 8, next_cursor: 100, has_more: true }}
      isLoading={false}
      isSaving={false}
      error={null}
      onLoadProfile={vi.fn()}
      onUpdateProfile={vi.fn()}
      onMute={vi.fn()}
      onBan={vi.fn()}
      onRelease={vi.fn()}
      onHideBatch={onHideBatch}
      onRestoreBatch={onRestoreBatch}
      onResetProfile={vi.fn()}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: /继续下一批/ }));

  expect(onRestoreBatch).toHaveBeenCalledWith({ cursor: 100, reason: undefined });
  expect(onHideBatch).not.toHaveBeenCalled();
});
