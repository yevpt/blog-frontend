import { describe, it, expect, vi, afterEach } from "vitest";
import { formatUploadFileSize, logUploadFileSize } from "./log-upload-file-size";

describe("logUploadFileSize", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("打印文件体积", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const file = new File([new Uint8Array(1024 * 1024)], "photo.webp", { type: "image/webp" });

    logUploadFileSize("comment:upload", file, { originalBytes: 512 * 1024 });

    expect(info).toHaveBeenCalledWith(
      "[upload-image:comment:upload]",
      expect.objectContaining({
        name: "photo.webp",
        sizeBytes: 1024 * 1024,
        sizeLabel: "1.000 MB",
        originalBytes: 512 * 1024,
      }),
    );
  });
});

describe("formatUploadFileSize", () => {
  it("格式化 KB", () => {
    expect(formatUploadFileSize(2048)).toBe("2.0 KB");
  });
});
