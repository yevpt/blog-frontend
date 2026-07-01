import imageCompression from "browser-image-compression";
import {
  ARTICLE_UPLOAD_MAX_BYTES,
  AVATAR_COMPRESS_TRIGGER_BYTES,
  AVATAR_SELECTION_MAX_BYTES,
  AVATAR_UPLOAD_MAX_BYTES,
  BACKEND_SAFE_MAX_PIXELS,
  COMMENT_IMAGE_COMPRESS_TARGET_BYTES,
  GIF_MAX_BYTES,
  IMAGE_SELECTION_MAX_BYTES,
  INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES,
  INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES,
  INTERACTIVE_IMAGE_MAX_EDGE_PX,
  INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES,
} from "./image-upload-limits";

export type ImageUploadScene = "moment" | "comment" | "article" | "avatar";

const WEBP_COMPRESS_INITIAL_QUALITY = 0.92;
const HEIC_CONVERT_QUALITY = 0.85;
const SUPPORTED_IMAGE_FORMATS_TEXT = "JPG、PNG、WebP、GIF 或 HEIC/HEIF 图片";
const HEIC_CONVERT_ERROR_MESSAGE = "HEIC 图片转换失败，请换一张或转为 JPG 后上传";

export const USER_FACING_IMAGE_ERROR_PREFIXES = [
  "只能上传图片文件",
  "不支持",
  "图片文件为空",
  "请选择",
  "图片过大",
  "图片不能超过",
  "GIF 图片过大",
  "图片无法读取",
  "HEIC 图片转换失败",
] as const;

const GENERIC_IMAGE_ERROR_MESSAGE = "图片处理失败，请重试";

/** @deprecated 使用场景常量替代 */
export const MAX_IMAGE_BYTES = INTERACTIVE_IMAGE_UPLOAD_MAX_BYTES;

let webpEncodeSupported: boolean | undefined;
let readImageDimensionsOverride: ((file: File) => Promise<ImageDimensions>) | undefined;

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * 按场景准备上传图片：合规原样返回；仅在超过阈值时高质量 WebP 压缩。
 */
export async function prepareImageForUpload(file: File, scene: ImageUploadScene): Promise<File> {
  validateImageFile(file);
  rejectOversizedSelection(file, scene);

  if (isGifImage(file)) {
    if (scene === "avatar") {
      throw new Error("不支持 GIF 头像，请上传 JPG、PNG 或 WebP 图片");
    }
    return handleGifUpload(file);
  }

  const convertedFromHeic = isHeicImage(file);
  let prepared = convertedFromHeic ? await convertHeicForUpload(file) : file;
  prepared = await enforceSceneLimits(prepared, scene, {
    // HEIC 转 WebP/JPEG 后体积常膨胀，需始终再压一层确保落在上传上限内
    alwaysCompress: convertedFromHeic && scene !== "article",
  });
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

function getSelectionMaxBytes(scene: ImageUploadScene): number {
  return scene === "avatar" ? AVATAR_SELECTION_MAX_BYTES : IMAGE_SELECTION_MAX_BYTES;
}

function getSelectionTooLargeMessage(scene: ImageUploadScene): string {
  const maxMb = getSelectionMaxBytes(scene) / (1024 * 1024);
  return scene === "avatar" ? `请选择 ${maxMb}MB 以内的头像图片` : `请选择 ${maxMb}MB 以内的图片`;
}

function rejectOversizedSelection(file: File, scene: ImageUploadScene): void {
  const maxBytes = getSelectionMaxBytes(scene);
  if (file.size > maxBytes) {
    throw new Error(getSelectionTooLargeMessage(scene));
  }
}

async function enforceSceneLimits(
  file: File,
  scene: ImageUploadScene,
  options?: { alwaysCompress?: boolean },
): Promise<File> {
  const uploadMaxBytes = getSceneUploadMaxBytes(scene);

  if (scene === "article") {
    if (file.size >= uploadMaxBytes) {
      throw new Error(getUploadTooLargeMessage(scene));
    }
    return file;
  }

  const triggerBytes =
    scene === "avatar" ? AVATAR_COMPRESS_TRIGGER_BYTES : INTERACTIVE_IMAGE_COMPRESS_TRIGGER_BYTES;
  const targetBytes = getSceneCompressTargetBytes(scene);
  const maxEdgePx = getSceneMaxEdgePx(scene);
  const dimensions = await readImageDimensions(file).catch(() => null);
  const needsResize = dimensions ? exceedsBackendPixelLimit(dimensions) : false;

  let prepared = file;
  if (options?.alwaysCompress || scene === "comment" || file.size > triggerBytes || needsResize) {
    prepared = await compressToWebPWithinBytes(file, targetBytes, maxEdgePx);
  }

  return ensureWithinUploadMax(prepared, targetBytes, uploadMaxBytes, scene, maxEdgePx);
}

function getSceneCompressTargetBytes(scene: ImageUploadScene): number {
  switch (scene) {
    case "avatar":
      return AVATAR_UPLOAD_MAX_BYTES;
    case "comment":
      return COMMENT_IMAGE_COMPRESS_TARGET_BYTES;
    default:
      return INTERACTIVE_IMAGE_COMPRESS_TARGET_BYTES;
  }
}

function getSceneMaxEdgePx(scene: ImageUploadScene): number {
  return scene === "article" ? 4096 : INTERACTIVE_IMAGE_MAX_EDGE_PX;
}

function exceedsBackendPixelLimit(dimensions: ImageDimensions): boolean {
  const { width, height } = dimensions;
  if (width <= 0 || height <= 0) return false;
  return (
    width * height >= BACKEND_SAFE_MAX_PIXELS ||
    width > INTERACTIVE_IMAGE_MAX_EDGE_PX ||
    height > INTERACTIVE_IMAGE_MAX_EDGE_PX
  );
}

async function readImageDimensions(file: File): Promise<ImageDimensions> {
  if (readImageDimensionsOverride) {
    return readImageDimensionsOverride(file);
  }

  if (typeof createImageBitmap !== "undefined") {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }

  if (typeof document === "undefined") {
    throw new Error("image dimensions unavailable");
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<ImageDimensions>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("image dimensions unavailable"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function ensureWithinUploadMax(
  file: File,
  compressTargetBytes: number,
  uploadMaxBytes: number,
  scene: ImageUploadScene,
  maxEdgePx: number,
): Promise<File> {
  let prepared = file;
  let targetBytes = compressTargetBytes;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (prepared.size < uploadMaxBytes) {
      return prepared;
    }
    targetBytes = Math.max(Math.floor(targetBytes * 0.75), 256 * 1024);
    prepared = await compressToWebPWithinBytes(prepared, targetBytes, maxEdgePx);
  }

  if (prepared.size >= uploadMaxBytes) {
    throw new Error(getUploadTooLargeMessage(scene));
  }
  return prepared;
}

function handleGifUpload(file: File): File {
  if (file.size > GIF_MAX_BYTES) {
    throw new Error("GIF 图片过大，暂不支持压缩该格式，请上传 300KB 以内的 GIF。");
  }
  return file;
}

async function compressToWebPWithinBytes(
  file: File,
  maxBytes: number,
  maxEdgePx: number,
): Promise<File> {
  const maxSizeMB = maxBytes / (1024 * 1024);
  const useWebP = canEncodeWebP();

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: maxEdgePx,
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
  if (typeof window === "undefined") {
    throw new Error(HEIC_CONVERT_ERROR_MESSAGE);
  }

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
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    type === "public.heic" ||
    type === "public.heif" ||
    /\.hei[cf]$/i.test(file.name)
  );
}

export function getImageProcessingErrorMessage(err: unknown): string {
  if (
    err instanceof Error &&
    USER_FACING_IMAGE_ERROR_PREFIXES.some((prefix) => err.message.startsWith(prefix))
  ) {
    return err.message;
  }
  return GENERIC_IMAGE_ERROR_MESSAGE;
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

/** 测试钩子：替换图片尺寸读取，避免 happy-dom 解码假文件卡住 */
export function setReadImageDimensionsForTests(
  fn: ((file: File) => Promise<ImageDimensions>) | undefined,
): void {
  readImageDimensionsOverride = fn;
}

export function resetReadImageDimensionsForTests(): void {
  readImageDimensionsOverride = undefined;
}
