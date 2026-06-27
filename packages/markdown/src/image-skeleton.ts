export const MD_IMAGE_WRAPPER_CLASS = "md-image-wrapper";
export const MD_IMAGE_SKELETON_CLASS = "md-image-skeleton";
export const MD_IMAGE_LOADED_ATTR = "data-md-image-loaded";
export const MD_IMAGE_PENDING_ATTR = "data-md-image-pending";
export const MD_IMAGE_WRAPPED_ATTR = "data-md-image-wrapped";

const VARIANT_WRAPPER_CLASS: Record<"article" | "comment", string> = {
  article: "md-image-wrapper--article",
  comment: "md-image-wrapper--comment",
};

function addClassToImgTag(tag: string, className: string): string {
  const classMatch = tag.match(/\sclass=(['"])([\s\S]*?)\1/i);
  if (classMatch) {
    const quote = classMatch[1];
    const existing = classMatch[2];
    if (existing.split(/\s+/).includes(className)) return tag;
    return tag.replace(classMatch[0], ` class=${quote}${existing} ${className}${quote}`);
  }
  return tag.replace(/<img\b/i, `<img class="${className}"`);
}

function setImgAttribute(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`\\s${name}=(['"])[\\s\\S]*?\\1`, "i");
  const attribute = ` ${name}="${value}"`;
  return pattern.test(tag)
    ? tag.replace(pattern, attribute)
    : tag.replace(/\s*\/?>$/, (closing) => `${attribute}${closing}`);
}

/** 在 HTML 字符串层面包裹图片骨架，首屏即有占位（不依赖 useEffect）。 */
export function wrapMarkdownImagesWithSkeletonHtml(
  html: string,
  variant: "article" | "comment" = "article",
): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (new RegExp(`\\b${MD_IMAGE_WRAPPED_ATTR}=`).test(tag)) return tag;

    const variantClass = VARIANT_WRAPPER_CLASS[variant];
    const imgTag = setImgAttribute(
      addClassToImgTag(tag, "md-image-pending"),
      MD_IMAGE_WRAPPED_ATTR,
      "true",
    );

    return (
      `<span class="${MD_IMAGE_WRAPPER_CLASS} ${variantClass}" ${MD_IMAGE_PENDING_ATTR}="true" aria-busy="true">` +
      `<span class="${MD_IMAGE_SKELETON_CLASS} loading-image-skeleton" aria-hidden="true"></span>` +
      `${imgTag}</span>`
    );
  });
}

/** 与 React 侧 useImageLoadPlaceholder 保持一致。 */
const MD_IMAGE_SKELETON_DELAY_MS = 200;

function revealImage(wrapper: HTMLElement, img: HTMLImageElement) {
  wrapper.querySelector(`.${MD_IMAGE_SKELETON_CLASS}`)?.remove();
  wrapper.setAttribute(MD_IMAGE_LOADED_ATTR, "true");
  wrapper.removeAttribute(MD_IMAGE_PENDING_ATTR);
  wrapper.setAttribute("aria-busy", "false");
  img.classList.remove("md-image-pending");
}

function ensureSkeletonVisible(wrapper: HTMLElement, img: HTMLImageElement) {
  let skeleton = wrapper.querySelector<HTMLElement>(`.${MD_IMAGE_SKELETON_CLASS}`);
  if (!skeleton) {
    skeleton = document.createElement("span");
    skeleton.className = `${MD_IMAGE_SKELETON_CLASS} loading-image-skeleton`;
    skeleton.setAttribute("aria-hidden", "true");
    wrapper.insertBefore(skeleton, img);
  }
  img.classList.add("md-image-pending");
}

/** 为已包裹骨架的 Markdown 图片绑定 load/error 事件。 */
export function bindMarkdownImageSkeletons(container: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  const images = container.querySelectorAll<HTMLImageElement>(
    `.${MD_IMAGE_WRAPPER_CLASS} img, img[${MD_IMAGE_WRAPPED_ATTR}]`,
  );

  for (const img of images) {
    if (img.dataset.mdImageSkeleton === "bound") continue;
    img.dataset.mdImageSkeleton = "bound";

    const wrapper = img.closest<HTMLElement>(`.${MD_IMAGE_WRAPPER_CLASS}`);
    if (!wrapper) continue;

    if (img.complete && img.naturalWidth > 0) {
      revealImage(wrapper, img);
      continue;
    }

    const skeleton = wrapper.querySelector<HTMLElement>(`.${MD_IMAGE_SKELETON_CLASS}`);
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    if (skeleton) {
      skeleton.style.opacity = "0";
      skeleton.style.transition = "opacity 200ms ease";
      revealTimer = setTimeout(() => {
        if (!wrapper.hasAttribute(MD_IMAGE_LOADED_ATTR)) {
          skeleton.style.opacity = "1";
        }
      }, MD_IMAGE_SKELETON_DELAY_MS);
    }

    const handleLoad = () => {
      if (revealTimer) clearTimeout(revealTimer);
      revealImage(wrapper, img);
    };
    const handleError = () => {
      if (revealTimer) clearTimeout(revealTimer);
      ensureSkeletonVisible(wrapper, img);
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);

    cleanups.push(() => {
      if (revealTimer) clearTimeout(revealTimer);
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
