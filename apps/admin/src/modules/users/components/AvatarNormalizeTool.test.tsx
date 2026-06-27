import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { toastQueue } from "../../../lib/toast";
import { AvatarNormalizeTool } from "./AvatarNormalizeTool";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    users: {
      normalizeAvatars: vi.fn(),
      clearUserAvatar: vi.fn(),
    },
  },
}));

describe("AvatarNormalizeTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    vi.mocked(apiClient.users.normalizeAvatars).mockResolvedValue({
      scanned: 2,
      updated: 1,
      cleared: 0,
      skipped: 0,
      ok: 0,
      failed: 1,
      items: [
        {
          user_id: 3,
          status: "updated",
          old_key: "avatar/user/old.png",
          new_key: "avatar/user/new.jpg",
        },
        {
          user_id: 106,
          status: "failed",
          old_key: "avatar/user/broken.bin",
          message: "avatar/user/broken.bin：无法解码为有效图片",
        },
      ],
    });
    vi.mocked(apiClient.users.clearUserAvatar).mockResolvedValue({
      user_id: 106,
      old_key: "avatar/user/broken.bin",
    });
  });

  it("处理全部时发送 clear_invalid 选项", async () => {
    const user = userEvent.setup();

    render(
      <>
        <AvatarNormalizeTool />
        <ToastRegion queue={toastQueue} />
      </>,
    );

    await user.click(screen.getByRole("checkbox", { name: "无法处理时自动清除" }));
    await user.click(screen.getByRole("button", { name: "处理全部" }));

    await waitFor(() => {
      expect(apiClient.users.normalizeAvatars).toHaveBeenCalledWith({ clear_invalid: true });
    });
    expect(screen.getByText("avatar/user/broken.bin")).toBeInTheDocument();
    expect(screen.getByText("avatar/user/broken.bin：无法解码为有效图片")).toBeInTheDocument();
  });

  it("失败项可单独清除头像", async () => {
    const user = userEvent.setup();

    render(
      <>
        <AvatarNormalizeTool />
        <ToastRegion queue={toastQueue} />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "处理全部" }));
    await user.click(await screen.findByRole("button", { name: "清除头像" }));

    await waitFor(() => {
      expect(apiClient.users.clearUserAvatar).toHaveBeenCalledWith(106);
    });
    expect(await screen.findByText("已清除")).toBeInTheDocument();
  });

  it("处理单个用户时发送 user_id", async () => {
    const user = userEvent.setup();

    render(<AvatarNormalizeTool />);

    await user.type(screen.getByLabelText("用户 ID"), "42");
    await user.click(screen.getByRole("button", { name: "处理该用户" }));

    await waitFor(() => {
      expect(apiClient.users.normalizeAvatars).toHaveBeenCalledWith({
        user_id: 42,
        clear_invalid: false,
      });
    });
  });
});
