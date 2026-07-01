import { describe, it, expect, vi, afterEach } from "vitest";
import { logMomentUploadImages } from "./log-moment-upload-images";
import type { MomentImageItem } from "./types";

describe("logMomentUploadImages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("打印本地图片体积信息", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const file = new File([new Uint8Array(1024 * 1024)], "photo.webp", { type: "image/webp" });
    const images: MomentImageItem[] = [
      { id: "1", file, previewUrl: "blob:1" },
      { id: "2", remoteUrl: "https://cdn.example/a.jpg", previewUrl: "https://cdn.example/a.jpg" },
    ];

    logMomentUploadImages("publish", images);

    expect(info).toHaveBeenCalledWith(
      "[moment-image:publish]",
      expect.objectContaining({
        count: 1,
        totalBytes: 1024 * 1024,
        files: [
          expect.objectContaining({
            name: "photo.webp",
            type: "image/webp",
            sizeBytes: 1024 * 1024,
            sizeLabel: "1.000 MB",
          }),
        ],
      }),
    );
  });

  it("无本地文件时不打印", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logMomentUploadImages("prepare", [
      { id: "1", remoteUrl: "https://cdn.example/a.jpg", previewUrl: "https://cdn.example/a.jpg" },
    ]);

    expect(info).not.toHaveBeenCalled();
  });
});
