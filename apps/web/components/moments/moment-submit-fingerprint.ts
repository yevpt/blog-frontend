import type { MomentImageItem } from "./types";

/** 单张图片的稳定身份：远端图用 URL，本地文件用 name:size:lastModified。 */
function imageIdentity(image: MomentImageItem): string {
  if (image.file) {
    return `file:${image.file.name}:${image.file.size}:${image.file.lastModified}`;
  }
  return `url:${image.remoteUrl ?? ""}`;
}

/** 按顺序拼接图片身份，保证图片顺序变化时指纹随之变化。 */
function imageIdentities(images: MomentImageItem[]): string[] {
  return images.map(imageIdentity);
}

/**
 * 新建碎语提交指纹：正文 + status + comment_status + 按序图片身份。
 * 用于 useIdempotencyKey("moment") 在同一载荷重试期间复用幂等键。
 */
export function momentPublishFingerprint(
  content: string,
  status: string,
  commentStatus: string,
  images: MomentImageItem[],
): string {
  return [content, status, commentStatus, ...imageIdentities(images)].join("|");
}

/**
 * 编辑碎语提交指纹：碎语 ID + 正文 + status + comment_status + 按序图片身份。
 * 用于 useIdempotencyKey("moment-edit") 在同一载荷重试期间复用幂等键。
 */
export function momentEditFingerprint(
  momentId: number,
  content: string,
  status: number,
  commentStatus: number,
  images: MomentImageItem[],
): string {
  return [
    String(momentId),
    content,
    String(status),
    String(commentStatus),
    ...imageIdentities(images),
  ].join("|");
}
