/** 头像最长边（px），与后端 avatar.Service 一致 */
export const AVATAR_MAX_EDGE_PX = 120;
/** 头像压缩后体积上限（字节） */
export const AVATAR_MAX_BYTES = 20 * 1024;

const JPEG_QUALITY_START = 85;
const JPEG_QUALITY_MIN = 35;
const JPEG_QUALITY_STEP = 5;
const MIN_SHRINK_DIMENSION = 24;
const SUPPORTED_FORMATS_TEXT = "JPG、PNG 或 WebP 图片";
const HEIC_CONVERT_ERROR_MESSAGE = "HEIC 图片转换失败，请换一张或转为 JPG 后上传";

export const AVATAR_ERROR_PREFIXES = [
  "只能上传图片文件",
  "不支持",
  "图片文件为空",
  "头像过大",
  "图片无法读取",
  "HEIC 图片转换失败",
] as const;

/**
 * 将用户头像压缩为最长边 120px、体积 ≤ 20KB 的 JPEG。
 * 算法对齐后端 imageutil.Process（质量阶梯 + 必要时再缩小 90%）。
 */
export async function compressAvatarImage(file: File): Promise<File> {
  validateAvatarFile(file);
  const normalized = isHeicImage(file) ? await convertHeicToJpeg(file) : file;
  const blob = await processAvatarBlob(normalized);
  return new File([blob], replaceImageExtension(normalized.name, "jpg"), {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

export function getAvatarProcessingErrorMessage(err: unknown): string {
  if (
    err instanceof Error &&
    AVATAR_ERROR_PREFIXES.some((prefix) => err.message.startsWith(prefix))
  ) {
    return err.message;
  }
  return "头像处理失败，请换一张图片重试";
}

function validateAvatarFile(file: File): void {
  if (file.size <= 0) {
    throw new Error("图片文件为空，请重新选择图片");
  }
  if (isGifImage(file)) {
    throw new Error("不支持 GIF 头像，请上传 JPG、PNG 或 WebP");
  }
  if (isHeicImage(file) || isSupportedRasterImage(file)) {
    return;
  }
  if (file.type.startsWith("image/") || getFileExtension(file.name)) {
    throw new Error(`不支持 ${getImageFormatName(file)} 格式，请上传 ${SUPPORTED_FORMATS_TEXT}`);
  }
  throw new Error(`只能上传图片文件，请选择 ${SUPPORTED_FORMATS_TEXT}`);
}

async function processAvatarBlob(file: File): Promise<Blob> {
  const image = await loadImage(file);
  try {
    let { width, height } = scaleToMaxEdge(
      image.naturalWidth,
      image.naturalHeight,
      AVATAR_MAX_EDGE_PX,
    );
    let canvas = drawToCanvas(image, width, height);

    while (true) {
      for (
        let quality = JPEG_QUALITY_START;
        quality >= JPEG_QUALITY_MIN;
        quality -= JPEG_QUALITY_STEP
      ) {
        const blob = await canvasToJpegBlob(canvas, quality);
        if (blob.size <= AVATAR_MAX_BYTES) {
          return blob;
        }
      }

      if (width <= MIN_SHRINK_DIMENSION || height <= MIN_SHRINK_DIMENSION) {
        throw new Error("头像过大，请换一张更小的图片");
      }

      width = Math.max(1, Math.floor(width * 0.9));
      height = Math.max(1, Math.floor(height * 0.9));
      canvas = resizeCanvas(canvas, width, height);
    }
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

function scaleToMaxEdge(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`图片无法读取，请确认文件未损坏，并尝试换一张 ${SUPPORTED_FORMATS_TEXT}`));
    };
    image.src = objectUrl;
  });
}

function drawToCanvas(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(`图片无法读取，请确认文件未损坏，并尝试换一张 ${SUPPORTED_FORMATS_TEXT}`);
  }
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function resizeCanvas(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(`图片无法读取，请确认文件未损坏，并尝试换一张 ${SUPPORTED_FORMATS_TEXT}`);
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(`图片无法读取，请确认文件未损坏，并尝试换一张 ${SUPPORTED_FORMATS_TEXT}`),
          );
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality / 100,
    );
  });
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
  const fallbackName = `avatar.${extension}`;
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
