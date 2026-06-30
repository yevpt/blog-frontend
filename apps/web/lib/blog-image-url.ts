export function isGifImageUrl(src: string): boolean {
  try {
    return new URL(src, "https://local.invalid").pathname.toLowerCase().endsWith(".gif");
  } catch {
    return false;
  }
}

/** 在 CDN 鉴权 URL 上追加变换参数 w、q。GIF 直链原 URL。 */
export function buildCdnImageUrl(src: string, width: number, quality = 75): string {
  if (isGifImageUrl(src)) return src;
  const url = toAbsoluteUrl(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality));
  return url.toString();
}

/** 移除变换与重试参数，回退原图预览用。 */
export function stripTransformParams(src: string): string {
  const url = toAbsoluteUrl(src);
  url.searchParams.delete("w");
  url.searchParams.delete("q");
  url.searchParams.delete("md_retry");
  return url.toString();
}

function toAbsoluteUrl(src: string): URL {
  try {
    return new URL(src);
  } catch {
    const base = typeof window !== "undefined" ? window.location.origin : "https://local.invalid";
    return new URL(src, base);
  }
}
