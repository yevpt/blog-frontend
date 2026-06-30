import { describe, it, expect, vi, beforeEach } from "vitest";

const prepareImageForUploadMock = vi.fn();
vi.mock("./prepare-image-upload", () => ({
  prepareImageForUpload: (file: File, scene: string) => prepareImageForUploadMock(file, scene),
}));

import {
  AVATAR_MAX_BYTES,
  compressAvatarImage,
  getAvatarProcessingErrorMessage,
} from "./compress-avatar";
import { AVATAR_UPLOAD_MAX_BYTES } from "./image-upload-limits";

function fileOf(bytes: number, type = "image/png", name = "avatar.png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("compressAvatarImage", () => {
  beforeEach(() => {
    prepareImageForUploadMock.mockReset();
    prepareImageForUploadMock.mockImplementation(async (file: File) => file);
  });

  it("委托 prepareImageForUpload 的 avatar 场景", async () => {
    const file = fileOf(100);

    const result = await compressAvatarImage(file);

    expect(prepareImageForUploadMock).toHaveBeenCalledWith(file, "avatar");
    expect(result).toBe(file);
  });

  it("导出上传体积上限常量", () => {
    expect(AVATAR_MAX_BYTES).toBe(AVATAR_UPLOAD_MAX_BYTES);
    expect(AVATAR_MAX_BYTES).toBe(256 * 1024);
  });

  it("透传用户可读错误", () => {
    expect(getAvatarProcessingErrorMessage(new Error("头像不能超过 256KB"))).toBe(
      "头像不能超过 256KB",
    );
  });
});
