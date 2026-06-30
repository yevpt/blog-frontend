import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const compressMock = vi.fn();
vi.mock("browser-image-compression", () => ({
  default: (...args: unknown[]) => compressMock(...args),
}));
const heic2anyMock = vi.fn();
vi.mock("heic2any", () => ({ default: (...args: unknown[]) => heic2anyMock(...args) }));

import { prepareImageForUpload, compressImage } from "./prepare-image-upload";
import {
  resetWebpEncodeSupportCacheForTests,
  setWebpEncodeSupportedForTests,
} from "./prepare-image-upload";
import {
  INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES,
  INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES,
  ARTICLE_UPLOAD_MAX_BYTES,
} from "./image-upload-limits";

function fileOf(bytes: number, type = "image/png", name = "x.png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("prepareImageForUpload", () => {
  beforeEach(() => {
    compressMock.mockReset();
    heic2anyMock.mockReset();
    resetWebpEncodeSupportCacheForTests();
    setWebpEncodeSupportedForTests(true);
  });

  afterEach(() => {
    resetWebpEncodeSupportCacheForTests();
  });

  it("碎语场景下 2MB 以内图片原样返回", async () => {
    const input = fileOf(69 * 1024, "image/webp", "small.webp");

    const result = await prepareImageForUpload(input, "moment");

    expect(result).toBe(input);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("碎语场景下超过 2MB 时以 WebP 压到 2MB 以内", async () => {
    const out = fileOf(INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES, "image/webp", "big.webp");
    compressMock.mockResolvedValue(out);

    const result = await prepareImageForUpload(
      fileOf(INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES + 1),
      "moment",
    );

    expect(compressMock).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        maxSizeMB: 2,
        useWebWorker: true,
        initialQuality: 0.92,
        fileType: "image/webp",
      }),
    );
    expect(result.type).toBe("image/webp");
    expect(result.name.endsWith(".webp")).toBe(true);
  });

  it("碎语场景压缩后仍超过 3MB 时抛错", async () => {
    compressMock.mockResolvedValue(fileOf(INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES + 1, "image/webp"));

    await expect(
      prepareImageForUpload(fileOf(INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES + 1), "moment"),
    ).rejects.toThrow("图片不能超过 3MB");
  });

  it("300KB 以内 GIF 原样返回", async () => {
    const gif = fileOf(300 * 1024, "image/gif", "motion.gif");

    const result = await prepareImageForUpload(gif, "comment");

    expect(result).toBe(gif);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("超过 300KB 的 GIF 直接拒绝", async () => {
    await expect(
      prepareImageForUpload(fileOf(300 * 1024 + 1, "image/gif", "large.gif"), "comment"),
    ).rejects.toThrow("GIF 图片过大，暂不支持压缩该格式，请上传 300KB 以内的 GIF。");
  });

  it("文章场景仅校验 10MB 上限且不压缩", async () => {
    const input = fileOf(5 * 1024 * 1024, "image/png", "cover.png");

    const result = await prepareImageForUpload(input, "article");

    expect(result).toBe(input);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("文章场景超过 10MB 时抛错", async () => {
    await expect(
      prepareImageForUpload(fileOf(ARTICLE_UPLOAD_MAX_BYTES + 1, "image/png"), "article"),
    ).rejects.toThrow("图片不能超过 10MB");
  });

  it("HEIC 优先转为 WebP", async () => {
    const heic = fileOf(100 * 1024, "image/heic", "photo.heic");
    const webpBlob = new Blob([new Uint8Array(80 * 1024)], { type: "image/webp" });
    heic2anyMock.mockResolvedValue(webpBlob);

    const result = await prepareImageForUpload(heic, "moment");

    expect(heic2anyMock).toHaveBeenCalledWith({
      blob: heic,
      toType: "image/webp",
      quality: 0.92,
    });
    expect(result.type).toBe("image/webp");
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("不支持 WebP 编码时 HEIC 降级为 JPEG", async () => {
    setWebpEncodeSupportedForTests(false);
    const heic = fileOf(100 * 1024, "image/heic", "photo.heic");
    const jpegBlob = new Blob([new Uint8Array(80 * 1024)], { type: "image/jpeg" });
    heic2anyMock.mockResolvedValue(jpegBlob);

    const result = await prepareImageForUpload(heic, "moment");

    expect(heic2anyMock).toHaveBeenCalledWith({
      blob: heic,
      toType: "image/jpeg",
      quality: 0.92,
    });
    expect(result.type).toBe("image/jpeg");
  });

  it("compressImage 仍映射到碎语场景", async () => {
    const input = fileOf(100, "image/png");

    const result = await compressImage(input);

    expect(result).toBe(input);
  });
});
