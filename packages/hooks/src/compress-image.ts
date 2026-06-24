import imageCompression from "browser-image-compression";

/** 后端单图硬限：1MB */
export const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_GIF_BYTES = 300 * 1024;

/** 压缩目标：约 0.5MB，安全落在后端 1MB 限制内 */
const TARGET_MB = 0.5;
const SUPPORTED_IMAGE_FORMATS_TEXT = "JPG、PNG、WebP、GIF 或 HEIC/HEIF 图片";
const HEIC_CONVERT_ERROR_MESSAGE = "HEIC 图片转换失败，请换一张或转为 JPG 后上传";
export const USER_FACING_IMAGE_ERROR_PREFIXES = [
  "只能上传图片文件",
  "不支持",
  "图片文件为空",
  "图片过大",
  "GIF 图片过大",
  "图片无法读取",
  "HEIC 图片转换失败",
];

/**
 * 将用户选择的图片压缩到 ~0.5MB 以内并返回新的 File。
 * - 仅接受 image/* 类型
 * - 压缩后仍 > 1MB 视为异常（极端大图），抛错由调用方提示
 */
export async function compressImage(file: File): Promise<File> {
  validateImageFile(file);
  if (isGifImage(file)) {
    if (file.size > MAX_GIF_BYTES) {
      throw new Error("GIF 图片过大，暂不支持压缩该格式，请上传 300KB 以内的 GIF。");
    }
    return file;
  }

  const normalizedFile = isHeicImage(file) ? await convertHeicToJpeg(file) : file;
  const compressed = await compressReadableImage(normalizedFile);
  if (compressed.size > MAX_IMAGE_BYTES) {
    throw new Error("图片过大，压缩后仍超过 1MB，请换一张更小的图片");
  }
  return compressed;
}

function validateImageFile(file: File): void {
  if (file.size <= 0) {
    throw new Error("图片文件为空，请重新选择图片");
  }

  if (isHeicImage(file) || isGifImage(file) || isSupportedRasterImage(file)) {
    return;
  }

  if (file.type.startsWith("image/") || getFileExtension(file.name)) {
    throw new Error(
      `不支持 ${getImageFormatName(file)} 格式，请上传 ${SUPPORTED_IMAGE_FORMATS_TEXT}`,
    );
  }

  throw new Error(`只能上传图片文件，请选择 ${SUPPORTED_IMAGE_FORMATS_TEXT}`);
}

async function compressReadableImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      maxSizeMB: TARGET_MB,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
    });
  } catch {
    throw new Error(`图片无法读取，请确认文件未损坏，并尝试换一张 ${SUPPORTED_IMAGE_FORMATS_TEXT}`);
  }
}

function isSupportedRasterImage(file: File): boolean {
  const type = file.type.toLowerCase();
  const extension = getFileExtension(file.name);
  return (
    type === "image/jpeg" ||
    type === "image/png" ||
    type === "image/webp" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "png" ||
    extension === "webp"
  );
}

function isGifImage(file: File): boolean {
  const type = file.type.toLowerCase();
  return type === "image/gif" || getFileExtension(file.name) === "gif";
}

function isHeicImage(file: File): boolean {
  const type = file.type.toLowerCase();
  return type === "image/heic" || type === "image/heif" || /\.hei[cf]$/i.test(file.name);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    if (!jpegBlob) {
      throw new Error("empty HEIC conversion result");
    }
    return new File([jpegBlob], replaceImageExtension(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    throw new Error(HEIC_CONVERT_ERROR_MESSAGE);
  }
}

function replaceImageExtension(fileName: string, extension: string): string {
  const fallbackName = `image.${extension}`;
  if (!fileName) {
    return fallbackName;
  }
  return /\.[^.]+$/.test(fileName) ? fileName.replace(/\.[^.]+$/, `.${extension}`) : fallbackName;
}

function getImageFormatName(file: File): string {
  const extension = getFileExtension(file.name);
  if (extension) {
    return extension.toUpperCase();
  }
  const [, subtype] = file.type.split("/");
  return subtype ? subtype.toUpperCase() : "当前";
}

function getFileExtension(fileName: string): string {
  return fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase() ?? "";
}
