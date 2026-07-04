import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminModerationProfileResp } from "@repo/api";
import { useUserModeration } from "../hooks/use-user-moderation";
import { UserModerationPanel } from "./UserModerationPanel";

vi.mock("../hooks/use-user-moderation", () => ({ useUserModeration: vi.fn() }));

const profile: AdminModerationProfileResp = {
  user_id: 7,
  trust_level: "normal",
  trust_source: "auto",
  manual_trust_locked: false,
  sanction_state: "active",
  clean_approval_streak: 0,
  corrected_count: 0,
  rejected_count: 0,
  high_risk_count: 0,
  violation_score: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const updateProfile = vi.fn().mockResolvedValue(undefined);
const muteUser = vi.fn().mockResolvedValue(undefined);

describe("UserModerationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserModeration).mockReturnValue({
      profile,
      batch: null,
      isLoading: false,
      isSaving: false,
      error: null,
      reload: vi.fn(),
      updateProfile,
      muteUser,
      banUser: vi.fn(),
      releaseUser: vi.fn(),
      hideContentBatch: vi.fn(),
      restoreContentBatch: vi.fn(),
    });
  });

  it("直接展示指定用户画像，不再要求输入用户 ID", () => {
    render(<UserModerationPanel userId={7} />);
    expect(screen.getByText("用户 #7")).toBeInTheDocument();
    expect(screen.queryByLabelText("用户 ID")).not.toBeInTheDocument();
  });

  it("可保存画像并执行禁言", async () => {
    const user = userEvent.setup();
    render(<UserModerationPanel userId={7} />);

    await user.click(screen.getByRole("button", { name: "保存画像" }));
    expect(updateProfile).toHaveBeenCalledWith({
      trust_level: "normal",
      manual_locked: false,
      restricted_until: null,
    });

    await user.type(screen.getByLabelText("处罚理由"), "发布广告");
    await user.click(screen.getByRole("button", { name: "禁言" }));
    expect(muteUser).toHaveBeenCalledWith({ reason: "发布广告", until: undefined });
  });
});
