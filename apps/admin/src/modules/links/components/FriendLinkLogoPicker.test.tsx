// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriendLinkLogoPicker } from "./FriendLinkLogoPicker";

const mockCompressAvatarImage = vi.fn();
const mockGetAvatarProcessingErrorMessage = vi.fn((err: unknown) =>
  err instanceof Error ? err.message : "处理失败",
);

vi.mock("@repo/hooks", () => ({
  compressAvatarImage: (...args: unknown[]) => mockCompressAvatarImage(...args),
  getAvatarProcessingErrorMessage: (err: unknown) => mockGetAvatarProcessingErrorMessage(err),
}));

const mockAddToast = vi.fn();
vi.mock("../../../lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

describe("FriendLinkLogoPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    mockCompressAvatarImage.mockImplementation(async (file: File) => file);
  });

  it("选择图片后压缩并回调 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FriendLinkLogoPicker value={null} onChange={onChange} />);

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockCompressAvatarImage).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ file, previewUrl: "blob:preview" }),
      );
    });
  });

  it("超过 2MB 时提示错误", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FriendLinkLogoPicker value={null} onChange={onChange} />);

    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(mockAddToast).toHaveBeenCalledWith("友链 Logo 不能超过 2MB", "error");
    expect(mockCompressAvatarImage).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
