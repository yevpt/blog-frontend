// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const heic2anyMock = vi.fn();
vi.mock("heic2any", () => ({ default: (...args: unknown[]) => heic2anyMock(...args) }));

import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_EDGE_PX,
  compressAvatarImage,
  getAvatarProcessingErrorMessage,
} from "./compress-avatar";

function fileOf(bytes: number, type = "image/png", name = "avatar.png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function mockImageLoad(width = 240, height = 120) {
  vi.spyOn(globalThis, "Image").mockImplementation(function MockImage(this: HTMLImageElement) {
    queueMicrotask(() => {
      Object.defineProperty(this, "naturalWidth", { value: width, configurable: true });
      Object.defineProperty(this, "naturalHeight", { value: height, configurable: true });
      this.onload?.(new Event("load"));
    });
    return this;
  });
}

function mockCanvasEncoding(size = 10 * 1024) {
  HTMLCanvasElement.prototype.toBlob = vi.fn(
    (callback: BlobCallback, type?: string, quality?: number) => {
      const bytes = quality !== undefined && quality < 0.5 ? size + 5000 : size;
      callback?.(new Blob([new Uint8Array(bytes)], { type: type ?? "image/jpeg" }));
    },
  ) as typeof HTMLCanvasElement.prototype.toBlob;

  HTMLCanvasElement.prototype.getContext = vi.fn(
    () =>
      ({
        drawImage: vi.fn(),
      }) as unknown as CanvasRenderingContext2D,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

describe("compressAvatarImage", () => {
  beforeEach(() => {
    heic2anyMock.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    mockImageLoad();
    mockCanvasEncoding(8 * 1024);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("将图片缩放并压缩为 JPEG File", async () => {
    const result = await compressAvatarImage(fileOf(100));

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("avatar.jpg");
    expect(result.size).toBeLessThanOrEqual(AVATAR_MAX_BYTES);
  });

  it("GIF 直接拒绝", async () => {
    await expect(compressAvatarImage(fileOf(100, "image/gif", "a.gif"))).rejects.toThrow(
      "不支持 GIF 头像",
    );
  });

  it("空文件直接拒绝", async () => {
    await expect(compressAvatarImage(fileOf(0))).rejects.toThrow("图片文件为空");
  });

  it("压缩后仍超过 20KB 时抛错", async () => {
    mockCanvasEncoding(AVATAR_MAX_BYTES + 1);

    await expect(compressAvatarImage(fileOf(100))).rejects.toThrow("头像过大，请换一张更小的图片");
  });

  it("HEIC 先转 JPEG 再压缩", async () => {
    const jpegBlob = new Blob([new Uint8Array(80)], { type: "image/jpeg" });
    heic2anyMock.mockResolvedValue(jpegBlob);

    const result = await compressAvatarImage(fileOf(100, "image/heic", "photo.heic"));

    expect(heic2anyMock).toHaveBeenCalled();
    expect(result.name).toBe("photo.jpg");
    expect(result.type).toBe("image/jpeg");
  });

  it("getAvatarProcessingErrorMessage 识别用户可读前缀", () => {
    expect(getAvatarProcessingErrorMessage(new Error("不支持 GIF 头像"))).toBe("不支持 GIF 头像");
    expect(getAvatarProcessingErrorMessage(new Error("boom"))).toBe(
      "头像处理失败，请换一张图片重试",
    );
  });

  it("导出常量与后端头像参数一致", () => {
    expect(AVATAR_MAX_EDGE_PX).toBe(120);
    expect(AVATAR_MAX_BYTES).toBe(20 * 1024);
  });
});
