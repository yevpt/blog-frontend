import {
  MD_GALLERY_CLASS,
  MD_GALLERY_COUNTER_CLASS,
  MD_GALLERY_DOT_ACTIVE_CLASS,
  MD_GALLERY_DOT_CLASS,
  MD_GALLERY_NEXT_CLASS,
  MD_GALLERY_PREV_CLASS,
  MD_GALLERY_TRACK_CLASS,
} from "./image-gallery";

function bindGallery(gallery: HTMLElement): () => void {
  const track = gallery.querySelector<HTMLElement>(`.${MD_GALLERY_TRACK_CLASS}`);
  if (!track) return () => undefined;

  const prev = gallery.querySelector<HTMLButtonElement>(`.${MD_GALLERY_PREV_CLASS}`);
  const next = gallery.querySelector<HTMLButtonElement>(`.${MD_GALLERY_NEXT_CLASS}`);
  const dots = Array.from(gallery.querySelectorAll<HTMLButtonElement>(`.${MD_GALLERY_DOT_CLASS}`));
  const counter = gallery.querySelector<HTMLElement>(`.${MD_GALLERY_COUNTER_CLASS}`);
  const count = dots.length || Number(gallery.dataset.count) || 1;

  const currentIndex = () => {
    const width = track.clientWidth;
    if (width <= 0) return 0;
    return Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / width)));
  };

  const scrollToIndex = (index: number) => {
    const clamped = Math.min(count - 1, Math.max(0, index));
    const left = clamped * track.clientWidth;
    // 测试环境（happy-dom）的元素可能没有 scrollTo
    if (typeof track.scrollTo === "function") {
      track.scrollTo({ left, behavior: "smooth" });
    } else {
      track.scrollLeft = left;
    }
  };

  const update = () => {
    const index = currentIndex();
    dots.forEach((dot, i) => dot.classList.toggle(MD_GALLERY_DOT_ACTIVE_CLASS, i === index));
    if (counter) counter.textContent = `${index + 1}/${count}`;
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index >= count - 1;
  };

  // 滚动同步用 rAF 节流；无 rAF 环境（极少数测试场景）直接同步更新
  let scheduled = false;
  const handleScroll = () => {
    if (typeof requestAnimationFrame !== "function") {
      update();
      return;
    }
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };

  const handlePrev = () => scrollToIndex(currentIndex() - 1);
  const handleNext = () => scrollToIndex(currentIndex() + 1);
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handlePrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      handleNext();
    }
  };
  const dotHandlers = dots.map((dot, index) => {
    const handler = () => scrollToIndex(index);
    dot.addEventListener("click", handler);
    return handler;
  });

  track.addEventListener("scroll", handleScroll, { passive: true });
  track.addEventListener("keydown", handleKeydown);
  prev?.addEventListener("click", handlePrev);
  next?.addEventListener("click", handleNext);
  update();

  return () => {
    track.removeEventListener("scroll", handleScroll);
    track.removeEventListener("keydown", handleKeydown);
    prev?.removeEventListener("click", handlePrev);
    next?.removeEventListener("click", handleNext);
    dots.forEach((dot, index) => dot.removeEventListener("click", dotHandlers[index]));
  };
}

/** 为容器内所有 .md-gallery 绑定翻页/指示点/键盘交互，返回统一清理函数。 */
export function bindMarkdownImageGalleries(container: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  const galleries = container.querySelectorAll<HTMLElement>(`.${MD_GALLERY_CLASS}`);
  for (const gallery of galleries) {
    // 防止 effects 依赖变化时重复绑定（与 image-skeleton 的 dataset 守卫同思路）
    if (gallery.dataset.mdGalleryBound === "true") continue;
    gallery.dataset.mdGalleryBound = "true";
    const unbind = bindGallery(gallery);
    cleanups.push(() => {
      delete gallery.dataset.mdGalleryBound;
      unbind();
    });
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}
