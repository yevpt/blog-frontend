export const MD_IMAGE_DEFERRED_ATTR = "data-md-image-deferred";
export const MD_IMAGE_SRC_DATA_ATTR = "data-md-src";
export const MD_IMAGE_SRCSET_DATA_ATTR = "data-md-srcset";
export const MD_IMAGE_SIZES_DATA_ATTR = "data-md-sizes";

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

function readHtmlAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}=(['"])([\\s\\S]*?)\\1`, "i"));
  return match?.[2] ? decodeHtmlAttribute(match[2]) : null;
}

function setHtmlAttribute(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`\\s${name}=(['"])[\\s\\S]*?\\1`, "i");
  const attribute = ` ${name}="${escapeHtmlAttribute(value)}"`;
  return pattern.test(tag)
    ? tag.replace(pattern, attribute)
    : tag.replace(/\s*\/?>$/, (closing) => `${attribute}${closing}`);
}

function removeHtmlAttribute(tag: string, name: string): string {
  return tag.replace(new RegExp(`\\s${name}=(['"])[\\s\\S]*?\\1`, "i"), "");
}

/**
 * 将 img 的 src/srcset 移入 data 属性，避免 SSR HTML 解析阶段发起图片请求。
 * 真实地址由客户端在页面主体就绪后懒加载激活。
 */
export function deferMarkdownImageSources(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (new RegExp(`\\b${MD_IMAGE_DEFERRED_ATTR}=`).test(tag)) return tag;

    const src = readHtmlAttribute(tag, "src");
    if (!src) return tag;

    let deferred = tag;
    deferred = setHtmlAttribute(deferred, MD_IMAGE_SRC_DATA_ATTR, src);
    deferred = removeHtmlAttribute(deferred, "src");

    const srcset = readHtmlAttribute(tag, "srcset");
    if (srcset) {
      deferred = setHtmlAttribute(deferred, MD_IMAGE_SRCSET_DATA_ATTR, srcset);
      deferred = removeHtmlAttribute(deferred, "srcset");
    }

    const sizes = readHtmlAttribute(tag, "sizes");
    if (sizes) {
      deferred = setHtmlAttribute(deferred, MD_IMAGE_SIZES_DATA_ATTR, sizes);
      deferred = removeHtmlAttribute(deferred, "sizes");
    }

    if (!readHtmlAttribute(deferred, "data-original-src")) {
      deferred = setHtmlAttribute(deferred, "data-original-src", src);
    }

    deferred = setHtmlAttribute(deferred, MD_IMAGE_DEFERRED_ATTR, "true");
    deferred = setHtmlAttribute(deferred, "loading", "lazy");
    deferred = setHtmlAttribute(deferred, "decoding", "async");
    return deferred;
  });
}

function activateDeferredImage(img: HTMLImageElement) {
  if (img.dataset.mdImageActivated === "true") return;

  const src = img.dataset.mdSrc;
  if (!src) return;

  img.dataset.mdImageActivated = "true";
  if (img.dataset.mdSrcset) img.srcset = img.dataset.mdSrcset;
  if (img.dataset.mdSizes) img.sizes = img.dataset.mdSizes;
  img.loading = "lazy";
  img.decoding = "async";
  img.src = src;
  img.removeAttribute(MD_IMAGE_DEFERRED_ATTR);
}

/** 页面主体就绪后，用 IntersectionObserver 懒加载激活延迟图片。 */
export function attachDeferredMarkdownImages(container: HTMLElement): () => void {
  const images = Array.from(
    container.querySelectorAll<HTMLImageElement>(
      `img[${MD_IMAGE_DEFERRED_ATTR}][${MD_IMAGE_SRC_DATA_ATTR}]`,
    ),
  );
  if (images.length === 0) return () => undefined;

  let observer: IntersectionObserver | null = null;
  let cancelled = false;

  const startObserving = () => {
    if (cancelled) return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          activateDeferredImage(entry.target as HTMLImageElement);
          observer?.unobserve(entry.target);
        }
      },
      { rootMargin: "240px 0px" },
    );

    for (const img of images) {
      if (img.dataset.mdImageActivated !== "true") observer.observe(img);
    }
  };

  const scheduleObserving = () => {
    if (cancelled) return;
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => startObserving(), { timeout: 1500 });
      return;
    }
    setTimeout(startObserving, 0);
  };

  if (document.readyState === "complete") {
    scheduleObserving();
  } else {
    window.addEventListener("load", scheduleObserving, { once: true });
  }

  return () => {
    cancelled = true;
    observer?.disconnect();
  };
}

export function activateDeferredMarkdownImage(img: HTMLImageElement) {
  activateDeferredImage(img);
}
