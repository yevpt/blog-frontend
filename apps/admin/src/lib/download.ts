/** 触发浏览器下载并在完成后撤销临时 Blob URL。 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

export function resolveDownloadFilename(preferred: string | undefined, fallback: string): string {
  return preferred?.trim() || fallback;
}
