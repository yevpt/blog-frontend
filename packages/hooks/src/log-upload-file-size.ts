export interface UploadFileSizeLogEntry {
  name: string;
  type: string;
  sizeBytes: number;
  sizeLabel: string;
}

export function formatUploadFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(3)} MB`;
}

export function toUploadFileSizeLogEntry(file: File): UploadFileSizeLogEntry {
  return {
    name: file.name,
    type: file.type || "(empty)",
    sizeBytes: file.size,
    sizeLabel: formatUploadFileSize(file.size),
  };
}

/** 调试上传体积：在控制台打印 file.size，便于对照后端报错 */
export function logUploadFileSize(
  context: string,
  file: File,
  extra?: Record<string, unknown>,
): void {
  if (typeof console === "undefined") return;
  // eslint-disable-next-line no-console
  console.info(`[upload-image:${context}]`, {
    ...toUploadFileSizeLogEntry(file),
    ...extra,
  });
}
