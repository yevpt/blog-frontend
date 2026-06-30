import imageCompression from "browser-image-compression";
import {
  ARTICLE_UPLOAD_MAX_BYTES,
  AVATAR_COMPRESS_TRIGGER_BYTES,
  AVATAR_UPLOAD_MAX_BYTES,
  GIF_MAX_BYTES,
  INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES,
  INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES,
  INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES,
} from "./image-upload-limits";

export type ImageUploadScene = "moment" | "comment" | "article" | "avatar";

const WEBP_COMPRESS_INITIAL_QUALITY = 0.92;
const HEIC_CONVERT_QUALITY = 0.92;
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
] as const;

/** @deprecated 使用场景常量替代 */
export const MAX_IMAGE_BYTES = INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES;

let webpEncodeSupported: boolean | undefined;

/**
 * 按场景准备上传图片：合规原样返回；仅在超过阈值时高质量 WebP 压缩。
 */
export async function prepareImageForUpload(file: File, scene: ImageUploadScene): Promise<File> {
  validateImageFile(file);

  if (isGifImage(file)) {
    return handleGifUpload(file);
  }

  let prepared = isHeicImage(file) ? await convertHeicForUpload(file) : file;
  prepared = await enforceSceneLimits(prepared, scene);
  return prepared;
}

/** 碎语 / 评论场景便捷方法 */
export async function compressImage(file: File): Promise<File> {
  return prepareImageForUpload(file, "moment");
}

function getSceneUploadMaxBytes(scene: ImageUploadScene): number {
  switch (scene) {
    case "article":
      return ARTICLE_UPLOAD_MAX_BYTES;
    case "avatar":
      return AVATAR_UPLOAD_MAX_BYTES;
    default:
      return INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES;
  }
}

function getUploadTooLargeMessage(scene: ImageUploadScene): string {
  switch (scene) {
    case "article":
      return "图片不能超过 10MB";
    case "avatar":
      return "头像不能超过 256KB";
    default:
      return "图片不能超过 3MB";
  }
}

async function enforceSceneLimits(file: File, scene: ImageUploadScene): Promise<File> {
  const uploadMaxBytes = getSceneUploadMaxBytes(scene);
  if (file.size > uploadMaxBytes) {
    throw new Error(getUploadTooLargeMessage(scene));
  }

  if (scene === "article") {
    return file;
  }

  const triggerBytes =
    scene === "avatar" ? AVATAR_COMPRESS_TRIGGER_BYTES : INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES;
  const targetBytes =
    scene === "avatar" ? AVATAR_UPLOAD_MAX_BYTES : INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES;

  if (file.size <= triggerBytes) {
    return file;
  }

  const compressed = await compressToWebPWithinBytes(file, targetBytes);
  if (compressed.size > uploadMaxBytes) {
    throw new Error(getUploadTooLargeMessage(scene));
  }
  return compressed;
}

function handleGifUpload(file: File): File {
  if (file.size > GIF_MAX_BYTES) {
    throw new Error("GIF 图片过大，暂不支持压缩该格式，请上传 300KB 以内的 GIF。");
  }
  return file;
}

async function compressToWebPWithinBytes(file: File, maxBytes: number): Promise<File> {
  const maxSizeMB = maxBytes / (1024 * 1024);
  const useWebP = canEncodeWebP();

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: 4096,
      useWebWorker: true,
      initialQuality: WEBP_COMPRESS_INITIAL_QUALITY,
      ...(useWebP ? { fileType: "image/webp" as const } : {}),
    });

    if (!useWebP) {
      return compressed;
    }

    return asWebPFile(compressed, file.name);
  } catch {
    throw new Error(`图片无法读取，请确认文件未损坏，并尝试换一张 ${SUPPORTED_IMAGE_FORMATS_TEXT}`);
  }
}

function asWebPFile(file: File, originalName: string): File {
  const name = replaceImageExtension(originalName, "webp");
  if (file.type === "image/webp" && file.name === name) {
    return file;
  }
  return new File([file], name, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}

function canEncodeWebP(): boolean {
  if (webpEncodeSupported !== undefined) {
    return webpEncodeSupported;
  }
  if (typeof document === "undefined") {
    webpEncodeSupported = true;
    return webpEncodeSupported;
  }
  try {
    const canvas = document.createElement("canvas");
    webpEncodeSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpEncodeSupported = false;
  }
  return webpEncodeSupported;
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

async function convertHeicForUpload(file: File): Promise<File> {
  const useWebP = canEncodeWebP();
  const toType = useWebP ? "image/webp" : "image/jpeg";
  const extension = useWebP ? "webp" : "jpg";

  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType,
      quality: HEIC_CONVERT_QUALITY,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!blob) {
      throw new Error("empty HEIC conversion result");
    }
    return new File([blob], replaceImageExtension(file.name, extension), {
      type: toType,
      lastModified: file.lastModified,
    });
  } catch {
    throw new Error(HEIC_CONVERT_ERROR_MESSAGE);
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

/** 测试钩子：重置 WebP 编码能力缓存 */
export function resetWebpEncodeSupportCacheForTests(): void {
  webpEncodeSupported = undefined;
}

/** 测试钩子：强制 WebP 编码能力检测结果 */
export function setWebpEncodeSupportedForTests(value: boolean | undefined): void {
  webpEncodeSupported = value;
}
