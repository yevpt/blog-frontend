import optimizedImageHosts from "./optimized-image-hosts.json";

export type CdnImagePreset =
  | "article"
  | "comment"
  | "article-cover"
  | "article-mobile-cover"
  | "thumbnail"
  | "off";

export type MarkdownImageVariant = "article" | "comment";

export const CDN_IMAGE_DEFAULT_QUALITY = 75;
export const CDN_IMAGE_MAX_RETRIES = 3;
export const CDN_IMAGE_RETRY_DELAY_MS = 1500;

const ALLOWED_HOSTS = new Set<string>(optimizedImageHosts);

const PRESET_WIDTHS: Record<Exclude<CdnImagePreset, "off">, readonly number[]> = {
  article: [640, 750, 828, 1080],
  comment: [384, 640],
  "article-cover": [640, 720, 1080],
  "article-mobile-cover": [640, 750, 828, 1080],
  thumbnail: [112],
};

const PRESET_SIZES: Record<Exclude<CdnImagePreset, "off">, string> = {
  article: "(max-width: 768px) calc(100vw - 40px), 768px",
  comment: "(max-width: 280px) calc(100vw - 40px), 240px",
  "article-cover": "(max-width: 768px) 100vw, 720px",
  "article-mobile-cover": "(max-width: 768px) 100vw, 55vw",
  thumbnail: "56px",
};

export function isGifImageUrl(src: string): boolean {
  try {
    return new URL(src, "https://local.invalid").pathname.toLowerCase().endsWith(".gif");
  } catch {
    return false;
  }
}

/** 在 CDN 鉴权 URL 上追加变换参数 w、q。GIF 直链原 URL。 */
export function buildCdnImageUrl(
  src: string,
  width: number,
  quality = CDN_IMAGE_DEFAULT_QUALITY,
): string {
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

export function isOptimizableRemoteImage(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) && !isGifImageUrl(src);
  } catch {
    return false;
  }
}

export interface CdnImageDisplayAttrs {
  originalSrc: string;
  optimizable: boolean;
  src: string;
  srcSet?: string;
  sizes?: string;
}

export interface ResolveCdnImageOptions {
  quality?: number;
  /** fixed：单一宽度 src，供编辑器等固定展示宽场景，避免 src+srcset 重复请求 */
  mode?: "responsive" | "fixed";
  /** mode=fixed 时取不小于该值的最近档位，默认 preset 最大档 */
  displayWidth?: number;
}

function pickDisplayWidth(widths: readonly number[], targetWidth: number): number {
  return widths.find((width) => width >= targetWidth) ?? widths.at(-1)!;
}

export function resolveCdnImageAttrs(
  originalSrc: string,
  preset: CdnImagePreset,
  options: ResolveCdnImageOptions = {},
): CdnImageDisplayAttrs {
  const quality = options.quality ?? CDN_IMAGE_DEFAULT_QUALITY;
  const mode = options.mode ?? "responsive";

  if (!originalSrc || preset === "off" || !isOptimizableRemoteImage(originalSrc)) {
    return { originalSrc, optimizable: false, src: originalSrc };
  }

  const widths = PRESET_WIDTHS[preset];

  if (mode === "fixed") {
    const width = pickDisplayWidth(widths, options.displayWidth ?? widths.at(-1)!);
    return {
      originalSrc,
      optimizable: true,
      src: buildCdnImageUrl(originalSrc, width, quality),
    };
  }

  const srcSet = widths
    .map((width) => `${buildCdnImageUrl(originalSrc, width, quality)} ${width}w`)
    .join(", ");
  const src = buildCdnImageUrl(originalSrc, widths.at(-1)!, quality);

  return {
    originalSrc,
    optimizable: true,
    src,
    srcSet,
    sizes: PRESET_SIZES[preset],
  };
}

const HTML_ENTITY_PATTERN = /&(?:#(\d+)|#x([\da-f]+)|(amp|quot|apos|lt|gt));/gi;
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

function decodeHtmlAttribute(value: string): string {
  return value.replace(
    HTML_ENTITY_PATTERN,
    (entity: string, decimal?: string, hexadecimal?: string, named?: string) => {
      if (named) return NAMED_ENTITIES[named.toLowerCase()] ?? entity;
      const codePoint = Number.parseInt(decimal ?? hexadecimal ?? "", hexadecimal ? 16 : 10);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    },
  );
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function setHtmlAttribute(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`\\s${name}=(['"])[\\s\\S]*?\\1`, "i");
  const attribute = ` ${name}="${escapeHtmlAttribute(value)}"`;
  return pattern.test(tag)
    ? tag.replace(pattern, attribute)
    : tag.replace(/\s*\/?>$/, (closing) => `${attribute}${closing}`);
}

export function optimizeMarkdownImages(html: string, variant: MarkdownImageVariant): string {
  const preset: CdnImagePreset = variant;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const sourceMatch = tag.match(/\ssrc=(['"])([\s\S]*?)\1/i);
    if (!sourceMatch?.[2]) return tag;
    const originalSrc = decodeHtmlAttribute(sourceMatch[2]);
    const attrs = resolveCdnImageAttrs(originalSrc, preset);
    if (!attrs.optimizable) return tag;

    let optimizedTag = setHtmlAttribute(tag, "src", attrs.src);
    optimizedTag = setHtmlAttribute(optimizedTag, "srcset", attrs.srcSet!);
    optimizedTag = setHtmlAttribute(optimizedTag, "sizes", attrs.sizes!);
    optimizedTag = setHtmlAttribute(optimizedTag, "loading", "lazy");
    optimizedTag = setHtmlAttribute(optimizedTag, "decoding", "async");
    optimizedTag = setHtmlAttribute(optimizedTag, "data-original-src", originalSrc);
    return setHtmlAttribute(optimizedTag, "data-md-image-optimized", "true");
  });
}

function toAbsoluteUrl(src: string): URL {
  try {
    return new URL(src);
  } catch {
    const base = typeof window !== "undefined" ? window.location.origin : "https://local.invalid";
    return new URL(src, base);
  }
}
