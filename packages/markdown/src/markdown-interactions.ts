import { attachMarkdownImageFallbacks } from "./image-fallback";
import { attachDeferredMarkdownImages } from "./image-deferred";
import { attachMarkdownImageRetries } from "./image-retry";
import { bindMarkdownImageSkeletons } from "./image-skeleton";
import { bindMarkdownImageGalleries } from "./image-gallery-interactions";

const CHECKMARK_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

export type MarkdownImagePreviewHandler = (
  images: { src: string; alt?: string }[],
  index: number,
) => void;

export function bindMarkdownContentInteractions(
  container: HTMLElement,
  options: {
    imageErrorFallback?: boolean;
    deferImages?: boolean;
    onImagePreview?: MarkdownImagePreviewHandler;
  } = {},
): () => void {
  const { imageErrorFallback = false, deferImages = false, onImagePreview } = options;
  const cleanups: Array<() => void> = [];

  const handleClick = (event: MouseEvent) => {
    const img = (event.target as Element).closest<HTMLImageElement>("img");
    if (img && onImagePreview) {
      const all = Array.from(container.querySelectorAll("img"));
      const items = all.map((el) => ({
        src: el.dataset.originalSrc || el.dataset.mdSrc || el.currentSrc || el.src,
        alt: el.alt || undefined,
      }));
      const index = all.indexOf(img);
      if (index >= 0) onImagePreview(items, index);
      return;
    }

    const btn = (event.target as Element).closest<HTMLButtonElement>(".md-copy-btn");
    if (!btn) return;
    const wrapper = btn.closest(".md-code-wrapper");
    if (!wrapper) return;
    const code = wrapper.querySelector("pre > code");
    if (!code) return;

    const originalHTML = btn.innerHTML;
    const text = code.textContent ?? "";
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = CHECKMARK_SVG;
      btn.style.color = "rgb(22, 163, 74)";
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.color = "";
      }, 2000);
    });
  };

  container.addEventListener("click", handleClick);
  cleanups.push(() => container.removeEventListener("click", handleClick));

  cleanups.push(bindMarkdownImageGalleries(container));
  cleanups.push(bindMarkdownImageSkeletons(container));
  if (deferImages) cleanups.push(attachDeferredMarkdownImages(container));
  cleanups.push(attachMarkdownImageRetries(container));
  if (imageErrorFallback) attachMarkdownImageFallbacks(container);

  return () => cleanups.forEach((cleanup) => cleanup());
}
