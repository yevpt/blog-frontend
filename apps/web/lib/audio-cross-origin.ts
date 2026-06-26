/** Web Audio 采样需要 crossOrigin；当前音乐 CDN 已开启 CORS，跨域音频也允许采样。 */
export function resolveAudioCrossOrigin(url: string, pageOrigin?: string): "anonymous" | undefined {
  try {
    const origin =
      pageOrigin ?? (typeof window !== "undefined" ? window.location.origin : undefined);
    const audioUrl = url.startsWith("/") && origin ? new URL(url, origin) : new URL(url);
    if (audioUrl.protocol === "http:" || audioUrl.protocol === "https:") return "anonymous";
  } catch {
    return undefined;
  }
  return undefined;
}
