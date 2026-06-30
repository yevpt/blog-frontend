import { prepareImageForUpload } from "./prepare-image-upload";
import { AVATAR_UPLOAD_MAX_BYTES } from "./image-upload-limits";

/** 头像最长边（px），与后端 avatar.Service 入库规范一致 */
export const AVATAR_MAX_EDGE_PX = 120;
/** 头像上传体积上限（字节），入库仍由后端压缩到 20KB */
export const AVATAR_MAX_BYTES = AVATAR_UPLOAD_MAX_BYTES;

const SUPPORTED_FORMATS_TEXT = "JPG、PNG 或 WebP 图片";

export const AVATAR_ERROR_PREFIXES = [
  "只能上传图片文件",
  "不支持",
  "图片文件为空",
  "头像过大",
  "图片无法读取",
  "HEIC 图片转换失败",
  "头像不能超过",
  "图片不能超过",
] as const;

/**
 * 准备头像上传：HEIC 转码；超过 200KB 时高质量 WebP 压到 ≤256KB；其余原样上传。
 * 120px / 20KB 入库规范由后端 PrepareForStorage 负责。
 */
export async function compressAvatarImage(file: File): Promise<File> {
  return prepareImageForUpload(file, "avatar");
}

export function getAvatarProcessingErrorMessage(err: unknown): string {
  if (
    err instanceof Error &&
    AVATAR_ERROR_PREFIXES.some((prefix) => err.message.startsWith(prefix))
  ) {
    return err.message;
  }
  return `头像处理失败，请换一张 ${SUPPORTED_FORMATS_TEXT} 重试`;
}
