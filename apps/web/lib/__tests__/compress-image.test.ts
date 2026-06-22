import { describe, it, expect, vi, beforeEach } from "vitest";

const compressMock = vi.fn();
vi.mock("browser-image-compression", () => ({ default: (...args: unknown[]) => compressMock(...args) }));

import { compressImage, MAX_IMAGE_BYTES } from "../compress-image";

function fileOf(bytes: number, type = "image/png"): File {
  return new File([new Uint8Array(bytes)], "x.png", { type });
}

describe("compressImage", () => {
  beforeEach(() => compressMock.mockReset());

  it("以 ~0.5MB 为目标调用压缩库并返回压缩后的 File", async () => {
    const out = fileOf(400 * 1024);
    compressMock.mockResolvedValue(out);
    const result = await compressImage(fileOf(2 * 1024 * 1024));
    expect(compressMock).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ maxSizeMB: 0.5, useWebWorker: true }),
    );
    expect(result).toBe(out);
  });

  it("压缩后仍超过 1MB 硬限时抛错", async () => {
    compressMock.mockResolvedValue(fileOf(MAX_IMAGE_BYTES + 1));
    await expect(compressImage(fileOf(3 * 1024 * 1024))).rejects.toThrow(/1MB/);
  });

  it("非图片类型直接抛错", async () => {
    await expect(compressImage(fileOf(100, "application/pdf"))).rejects.toThrow(/图片/);
    expect(compressMock).not.toHaveBeenCalled();
  });
});
