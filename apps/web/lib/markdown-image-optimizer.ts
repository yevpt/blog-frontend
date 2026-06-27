import optimizedImageHosts from "@/config/optimized-image-hosts.json";

export type MarkdownImageVariant = "article" | "comment";

const ALLOWED_HOSTS = new Set<string>(optimizedImageHosts);
const WIDTHS: Record<MarkdownImageVariant, readonly number[]> = {
  article: [640, 750, 828, 1080],
  comment: [384, 640],
};
const SIZES: Record<MarkdownImageVariant, string> = {
  article: "(max-width: 768px) calc(100vw - 40px), 768px",
  comment: "(max-width: 280px) calc(100vw - 40px), 240px",
};

export function isGifImageUrl(src: string): boolean {
  try {
    return new URL(src, "https://local.invalid").pathname.toLowerCase().endsWith(".gif");
  } catch {
    return false;
  }
}

function isOptimizableRemoteImage(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) && !isGifImageUrl(src);
  } catch {
    return false;
  }
}

function nextImageUrl(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
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
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const sourceMatch = tag.match(/\ssrc=(['"])([\s\S]*?)\1/i);
    if (!sourceMatch?.[2]) return tag;
    const originalSrc = decodeHtmlAttribute(sourceMatch[2]);
    if (!isOptimizableRemoteImage(originalSrc)) return tag;

    const widths = WIDTHS[variant];
    const sourceSet = widths
      .map((width) => `${nextImageUrl(originalSrc, width)} ${width}w`)
      .join(", ");
    let optimizedTag = setHtmlAttribute(tag, "src", nextImageUrl(originalSrc, widths.at(-1)!));
    optimizedTag = setHtmlAttribute(optimizedTag, "srcset", sourceSet);
    optimizedTag = setHtmlAttribute(optimizedTag, "sizes", SIZES[variant]);
    optimizedTag = setHtmlAttribute(optimizedTag, "loading", "lazy");
    optimizedTag = setHtmlAttribute(optimizedTag, "decoding", "async");
    optimizedTag = setHtmlAttribute(optimizedTag, "data-original-src", originalSrc);
    return setHtmlAttribute(optimizedTag, "data-md-image-optimized", "true");
  });
}
