import type { Element } from "hast";

export const MD_IMAGE_FALLBACK_CLASS = "md-image-fallback";
export const MD_IMAGE_FALLBACK_LABEL = "图片无法加载";

export const MD_IMAGE_FALLBACK_ICON = "image-off";

/** 破损图片占位：依赖页面内 SvgSprite 的 image-off 图标（画框 + 斜杠）。 */
export function buildImageFallbackHast(): Element {
  return {
    type: "element",
    tagName: "span",
    properties: {
      className: [MD_IMAGE_FALLBACK_CLASS],
      role: "img",
      ariaLabel: MD_IMAGE_FALLBACK_LABEL,
    },
    children: [
      {
        type: "element",
        tagName: "svg",
        properties: {
          width: "24",
          height: "24",
          ariaHidden: "true",
          className: ["md-image-fallback__icon", "pointer-events-none"],
        },
        children: [
          {
            type: "element",
            tagName: "use",
            properties: { href: `#icon-${MD_IMAGE_FALLBACK_ICON}` },
            children: [],
          },
        ],
      },
    ],
  };
}

export function buildImageFallbackHtml(): string {
  return `<span class="${MD_IMAGE_FALLBACK_CLASS}" role="img" aria-label="${MD_IMAGE_FALLBACK_LABEL}"><svg width="24" height="24" aria-hidden="true" class="md-image-fallback__icon pointer-events-none"><use href="#icon-${MD_IMAGE_FALLBACK_ICON}"></use></svg></span>`;
}

/** 为 Markdown 正文内图片绑定加载失败回退（无效 src 由 stripInvalidImages 预处理）。 */
export function attachMarkdownImageFallbacks(container: HTMLElement): void {
  const imgs = container.querySelectorAll<HTMLImageElement>("img");
  for (const img of imgs) {
    if (img.dataset.mdImageFallback === "bound") continue;
    img.dataset.mdImageFallback = "bound";

    const swap = () => {
      const template = document.createElement("template");
      template.innerHTML = buildImageFallbackHtml().trim();
      const fallback = template.content.firstElementChild;
      if (fallback) img.replaceWith(fallback);
    };

    img.addEventListener("error", swap, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      swap();
    }
  }
}
