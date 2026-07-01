import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const compressMock = vi.fn();
vi.mock("browser-image-compression", () => ({
  default: (...args: unknown[]) => compressMock(...args),
}));
const heic2anyMock = vi.fn();
vi.mock("heic2any", () => ({ default: (...args: unknown[]) => heic2anyMock(...args) }));

import {
  prepareImageForUpload,
  compressImage,
  getImageProcessingErrorMessage,
} from "./prepare-image-upload";
import {
  resetWebpEncodeSupportCacheForTests,
  setWebpEncodeSupportedForTests,
  resetReadImageDimensionsForTests,
  setReadImageDimensionsForTests,
} from "./prepare-image-upload";
import {
  INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES,
  INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES,
  INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES,
  INTERACTIVE_IMAGE_MAX_EDGE_PX,
  COMMENT_IMAGE_COMPRESS_TARGET_BYTES,
  ARTICLE_UPLOAD_MAX_BYTES,
  IMAGE_SELECTION_MAX_BYTES,
} from "./image-upload-limits";

function fileOf(bytes: number, type = "image/png", name = "x.png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("prepareImageForUpload", () => {
  beforeEach(() => {
    compressMock.mockReset();
    heic2anyMock.mockReset();
    resetWebpEncodeSupportCacheForTests();
    resetReadImageDimensionsForTests();
    setWebpEncodeSupportedForTests(true);
    setReadImageDimensionsForTests(async () => {
      throw new Error("dimensions unavailable in test");
    });
  });

  afterEach(() => {
    resetWebpEncodeSupportCacheForTests();
    resetReadImageDimensionsForTests();
  });

  it("碎语场景下 2MB 以内图片原样返回", async () => {
    const input = fileOf(69 * 1024, "image/webp", "small.webp");

    const result = await prepareImageForUpload(input, "moment");

    expect(result).toBe(input);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("碎语场景超过 10MB 选图上限时立即拒绝", async () => {
    await expect(
      prepareImageForUpload(fileOf(IMAGE_SELECTION_MAX_BYTES + 1, "image/png"), "moment"),
    ).rejects.toThrow("请选择 10MB 以内的图片");
    expect(heic2anyMock).not.toHaveBeenCalled();
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("HEIC 超过 10MB 选图上限时不触发转码", async () => {
    await expect(
      prepareImageForUpload(
        fileOf(IMAGE_SELECTION_MAX_BYTES + 1, "image/heic", "photo.heic"),
        "moment",
      ),
    ).rejects.toThrow("请选择 10MB 以内的图片");
    expect(heic2anyMock).not.toHaveBeenCalled();
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
        maxWidthOrHeight: INTERACTIVE_IMAGE_MAX_EDGE_PX,
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
    expect(compressMock.mock.calls.length).toBeGreaterThanOrEqual(2);
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

  it("头像场景拒绝 GIF", async () => {
    const gif = fileOf(100 * 1024, "image/gif", "avatar.gif");

    await expect(prepareImageForUpload(gif, "avatar")).rejects.toThrow("不支持 GIF 头像");
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
    ).rejects.toThrow("请选择 10MB 以内的图片");
  });

  it("HEIC 优先转为 WebP 并始终再压缩一层", async () => {
    const heic = fileOf(100 * 1024, "image/heic", "photo.heic");
    const webpBlob = new Blob([new Uint8Array(80 * 1024)], { type: "image/webp" });
    const compressed = fileOf(80 * 1024, "image/webp", "photo.webp");
    heic2anyMock.mockResolvedValue(webpBlob);
    compressMock.mockResolvedValue(compressed);

    const result = await prepareImageForUpload(heic, "moment");

    expect(heic2anyMock).toHaveBeenCalledWith({
      blob: heic,
      toType: "image/webp",
      quality: 0.85,
    });
    expect(compressMock).toHaveBeenCalled();
    expect(result.type).toBe("image/webp");
  });

  it("不支持 WebP 编码时 HEIC 降级为 JPEG", async () => {
    setWebpEncodeSupportedForTests(false);
    const heic = fileOf(100 * 1024, "image/heic", "photo.heic");
    const jpegBlob = new Blob([new Uint8Array(80 * 1024)], { type: "image/jpeg" });
    const compressed = fileOf(80 * 1024, "image/jpeg", "photo.jpg");
    heic2anyMock.mockResolvedValue(jpegBlob);
    compressMock.mockResolvedValue(compressed);

    const result = await prepareImageForUpload(heic, "moment");

    expect(heic2anyMock).toHaveBeenCalledWith({
      blob: heic,
      toType: "image/jpeg",
      quality: 0.85,
    });
    expect(result.type).toBe("image/jpeg");
  });

  it("HEIC 转码后超过 3MB 时先压缩再上传", async () => {
    const heic = fileOf(100 * 1024, "image/heic", "photo.heic");
    const largeWebpBlob = new Blob([new Uint8Array(INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES + 1)], {
      type: "image/webp",
    });
    const compressed = fileOf(INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES, "image/webp", "photo.webp");
    heic2anyMock.mockResolvedValue(largeWebpBlob);
    compressMock.mockResolvedValue(compressed);

    const result = await prepareImageForUpload(heic, "moment");

    expect(compressMock).toHaveBeenCalled();
    expect(result.type).toBe("image/webp");
    expect(result.size).toBe(INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES);
  });

  it("HEIC 转码后恰好 3MB 时仍会继续压缩", async () => {
    const heic = fileOf(100 * 1024, "image/heic", "photo.heic");
    const exactLimitWebp = new Blob([new Uint8Array(INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES)], {
      type: "image/webp",
    });
    const compressed = fileOf(INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES, "image/webp", "photo.webp");
    heic2anyMock.mockResolvedValue(exactLimitWebp);
    compressMock.mockResolvedValue(compressed);

    const result = await prepareImageForUpload(heic, "moment");

    expect(compressMock).toHaveBeenCalled();
    expect(result.size).toBeLessThan(INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES);
  });

  it("评论场景始终压缩到 500KB 并限制最长边", async () => {
    const input = fileOf(100 * 1024, "image/jpeg", "small.jpg");
    const compressed = fileOf(COMMENT_IMAGE_COMPRESS_TARGET_BYTES, "image/webp", "small.webp");
    compressMock.mockResolvedValue(compressed);

    const result = await prepareImageForUpload(input, "comment");

    expect(compressMock).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        maxSizeMB: COMMENT_IMAGE_COMPRESS_TARGET_BYTES / (1024 * 1024),
        maxWidthOrHeight: INTERACTIVE_IMAGE_MAX_EDGE_PX,
      }),
    );
    expect(result).toBe(compressed);
  });

  it("超像素上限时即使体积较小也会压缩", async () => {
    setReadImageDimensionsForTests(async () => ({ width: 4032, height: 3024 }));
    const input = fileOf(100 * 1024, "image/jpeg", "iphone.jpg");
    const compressed = fileOf(400 * 1024, "image/webp", "iphone.webp");
    compressMock.mockResolvedValue(compressed);

    const result = await prepareImageForUpload(input, "moment");

    expect(compressMock).toHaveBeenCalled();
    expect(result).toBe(compressed);
  });

  it("compressImage 仍映射到碎语场景", async () => {
    const input = fileOf(100, "image/png");

    const result = await compressImage(input);

    expect(result).toBe(input);
  });
});

describe("getImageProcessingErrorMessage", () => {
  it("已知前缀错误原样返回", () => {
    expect(getImageProcessingErrorMessage(new Error("图片不能超过 3MB"))).toBe("图片不能超过 3MB");
  });

  it("未知错误返回通用提示", () => {
    expect(getImageProcessingErrorMessage(new TypeError("boom"))).toBe("图片处理失败，请重试");
  });
});
