const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function withRetryAttempt(src: string, attempt: number): string {
  const url = new URL(src, document.baseURI);
  url.searchParams.set("md_retry", String(attempt));
  return url.href;
}

export function attachMarkdownImageRetries(container: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  const images = container.querySelectorAll<HTMLImageElement>(
    'img[data-md-image-optimized="true"][data-original-src]',
  );

  for (const image of images) {
    const originalSrc = image.dataset.originalSrc;
    if (!originalSrc) continue;
    let retrySource: string | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let usingOriginal = false;

    const handleError = (event: Event) => {
      if (usingOriginal) return;
      event.stopImmediatePropagation();
      if (retryTimer) return;

      retrySource ??= image.currentSrc || image.src;
      if (retryCount < MAX_RETRIES) {
        retryCount += 1;
        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        retryTimer = setTimeout(() => {
          retryTimer = null;
          image.src = withRetryAttempt(retrySource!, retryCount);
        }, RETRY_DELAY_MS);
        return;
      }

      usingOriginal = true;
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.src = originalSrc;
    };

    image.addEventListener("error", handleError);
    cleanups.push(() => {
      image.removeEventListener("error", handleError);
      if (retryTimer) clearTimeout(retryTimer);
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
