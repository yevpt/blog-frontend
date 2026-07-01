import type { MomentImageItem } from "./types";
import { formatUploadFileSize, toUploadFileSizeLogEntry } from "@repo/hooks";

export type MomentImageUploadLogPhase = "prepare" | "publish";

/** 调试碎语图片体积：在选图处理后 / 发布前打印 file.size */
export function logMomentUploadImages(
  phase: MomentImageUploadLogPhase,
  images: MomentImageItem[],
): void {
  const files = images.flatMap((item, index) => {
    if (!item.file) return [];
    return [{ index, ...toUploadFileSizeLogEntry(item.file) }];
  });

  if (files.length === 0) return;

  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  console.info(`[moment-image:${phase}]`, {
    count: files.length,
    totalBytes,
    totalLabel: formatUploadFileSize(totalBytes),
    files,
  });
}
