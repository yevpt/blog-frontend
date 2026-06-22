import imageCompression from "browser-image-compression";

/** 后端单图硬限：1MB */
export const MAX_IMAGE_BYTES = 1024 * 1024;

/** 压缩目标：约 0.5MB，安全落在后端 1MB 限制内 */
const TARGET_MB = 0.5;

/**
 * 将用户选择的图片压缩到 ~0.5MB 以内并返回新的 File。
 * - 仅接受 image/* 类型
 * - 压缩后仍 > 1MB 视为异常（极端大图），抛错由调用方提示
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("只能添加图片");
  }
  const compressed = await imageCompression(file, {
    maxSizeMB: TARGET_MB,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
  });
  if (compressed.size > MAX_IMAGE_BYTES) {
    throw new Error("图片过大，压缩后仍超过 1MB");
  }
  return compressed;
}
