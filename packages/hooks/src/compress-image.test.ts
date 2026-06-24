import { describe, it, expect, vi, beforeEach } from "vitest";

const compressMock = vi.fn();
vi.mock("browser-image-compression", () => ({
  default: (...args: unknown[]) => compressMock(...args),
}));
const heic2anyMock = vi.fn();
vi.mock("heic2any", () => ({ default: (...args: unknown[]) => heic2anyMock(...args) }));

import { compressImage, MAX_IMAGE_BYTES } from "./compress-image";

function fileOf(bytes: number, type = "image/png", name = "x.png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("compressImage", () => {
  beforeEach(() => {
    compressMock.mockReset();
    heic2anyMock.mockReset();
  });

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
    await expect(compressImage(fileOf(3 * 1024 * 1024))).rejects.toThrow(
      "图片过大，压缩后仍超过 1MB，请换一张更小的图片",
    );
  });

  it("300KB 以内 GIF 原样返回且不进入静态图压缩", async () => {
    const gif = fileOf(300 * 1024, "image/gif", "motion.gif");

    const result = await compressImage(gif);

    expect(result).toBe(gif);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("超过 300KB 的 GIF 直接提示无法压缩", async () => {
    await expect(compressImage(fileOf(300 * 1024 + 1, "image/gif", "large.gif"))).rejects.toThrow(
      "GIF 图片过大，暂不支持压缩该格式，请上传 300KB 以内的 GIF。",
    );
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("WebP 图片进入静态图压缩链路", async () => {
    const webp = fileOf(100, "image/webp", "photo.webp");
    const out = fileOf(80, "image/webp", "photo.webp");
    compressMock.mockResolvedValue(out);

    const result = await compressImage(webp);

    expect(result).toBe(out);
    expect(compressMock).toHaveBeenCalledWith(
      webp,
      expect.objectContaining({ maxSizeMB: 0.5, useWebWorker: true }),
    );
  });

  it("非图片类型直接抛错", async () => {
    await expect(compressImage(fileOf(100, "application/pdf", "doc.pdf"))).rejects.toThrow(
      "不支持 PDF 格式，请上传 JPG、PNG、WebP、GIF 或 HEIC/HEIF 图片",
    );
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("空图片文件直接抛出具体错误", async () => {
    await expect(compressImage(fileOf(0, "image/png", "empty.png"))).rejects.toThrow(
      "图片文件为空，请重新选择图片",
    );
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("不支持的图片格式直接抛出具体错误", async () => {
    await expect(compressImage(fileOf(100, "image/svg+xml", "vector.svg"))).rejects.toThrow(
      "不支持 SVG 格式，请上传 JPG、PNG、WebP、GIF 或 HEIC/HEIF 图片",
    );
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("压缩库无法读取图片时抛出可操作错误", async () => {
    compressMock.mockRejectedValue(new Error("The image could not be decoded"));

    await expect(compressImage(fileOf(100, "image/png", "broken.png"))).rejects.toThrow(
      "图片无法读取，请确认文件未损坏，并尝试换一张 JPG、PNG、WebP、GIF 或 HEIC/HEIF 图片",
    );
  });

  it("HEIC 图片先转 JPEG 再进入压缩流程", async () => {
    const heic = fileOf(100, "image/heic", "photo.heic");
    const jpegBlob = new Blob([new Uint8Array(80)], { type: "image/jpeg" });
    const out = fileOf(70, "image/jpeg", "photo.jpg");
    heic2anyMock.mockResolvedValue(jpegBlob);
    compressMock.mockResolvedValue(out);

    const result = await compressImage(heic);

    expect(heic2anyMock).toHaveBeenCalledWith({
      blob: heic,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const compressedInput = compressMock.mock.calls[0]?.[0];
    expect(compressedInput).toBeInstanceOf(File);
    expect((compressedInput as File).name).toBe("photo.jpg");
    expect((compressedInput as File).type).toBe("image/jpeg");
    expect(result).toBe(out);
  });

  it("空 MIME 的 .heic 文件也按 HEIC 处理", async () => {
    const heic = fileOf(100, "", "photo.HEIC");
    const jpegBlob = new Blob([new Uint8Array(80)], { type: "image/jpeg" });
    const out = fileOf(70, "image/jpeg", "photo.jpg");
    heic2anyMock.mockResolvedValue(jpegBlob);
    compressMock.mockResolvedValue(out);

    await compressImage(heic);

    expect(heic2anyMock).toHaveBeenCalled();
  });

  it("HEIC 转换失败时抛出用户可读错误", async () => {
    heic2anyMock.mockRejectedValue(new Error("decode failed"));

    await expect(compressImage(fileOf(100, "image/heif", "photo.heif"))).rejects.toThrow(
      "HEIC 图片转换失败，请换一张或转为 JPG 后上传",
    );
    expect(compressMock).not.toHaveBeenCalled();
  });
});
