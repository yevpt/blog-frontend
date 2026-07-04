import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markdownToHtmlSync } from "./render";
import { bindMarkdownImageGalleries } from "./image-gallery-interactions";
import { bindMarkdownContentInteractions } from "./markdown-interactions";

const TRACK_WIDTH = 600;

/** 渲染两图轮播并补齐 happy-dom 缺失的布局/滚动能力 */
function setupGallery(markdown = "![一](/img/1.png)\n\n![二](/img/2.png)") {
  const container = document.createElement("div");
  container.innerHTML = markdownToHtmlSync(markdown, { groupImageGalleries: true });
  document.body.appendChild(container);

  const track = container.querySelector<HTMLElement>(".md-gallery-track");
  if (!track) throw new Error("md-gallery-track 不存在");
  Object.defineProperty(track, "clientWidth", { value: TRACK_WIDTH, configurable: true });
  let scrollLeft = 0;
  Object.defineProperty(track, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
    },
  });
  // happy-dom 无 Element.scrollTo：桩实现 = 赋值 + 触发 scroll 事件
  Object.defineProperty(track, "scrollTo", {
    configurable: true,
    value: (options: ScrollToOptions) => {
      scrollLeft = options.left ?? 0;
      track.dispatchEvent(new Event("scroll"));
    },
  });
  return { container, track };
}

beforeEach(() => {
  // rAF 立即执行，保证指示点同步是同步断言
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("bindMarkdownImageGalleries", () => {
  it("点击下一张：滚动一屏、计数与指示点同步、末页禁用下一张", () => {
    const { container } = setupGallery();
    const cleanup = bindMarkdownImageGalleries(container);

    const next = container.querySelector<HTMLButtonElement>(".md-gallery-next");
    const prev = container.querySelector<HTMLButtonElement>(".md-gallery-prev");
    const counter = container.querySelector(".md-gallery-counter");
    expect(prev?.disabled).toBe(true);

    next?.click();
    expect(counter?.textContent).toBe("2/2");
    expect(next?.disabled).toBe(true);
    expect(prev?.disabled).toBe(false);
    const dots = container.querySelectorAll(".md-gallery-dot");
    expect(dots[1]?.classList.contains("is-active")).toBe(true);
    expect(dots[0]?.classList.contains("is-active")).toBe(false);
    cleanup();
  });

  it("点击指示点跳转到对应页", () => {
    const { container } = setupGallery(
      "![一](/img/1.png)\n\n![二](/img/2.png)\n\n![三](/img/3.png)",
    );
    const cleanup = bindMarkdownImageGalleries(container);
    const dots = container.querySelectorAll<HTMLButtonElement>(".md-gallery-dot");
    dots[2]?.click();
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("3/3");
    cleanup();
  });

  it("track 上左右方向键翻页", () => {
    const { container, track } = setupGallery();
    const cleanup = bindMarkdownImageGalleries(container);
    track.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("2/2");
    track.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("1/2");
    cleanup();
  });

  it("清理函数解绑事件", () => {
    const { container } = setupGallery();
    const cleanup = bindMarkdownImageGalleries(container);
    cleanup();
    container.querySelector<HTMLButtonElement>(".md-gallery-next")?.click();
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("1/2");
  });

  it("bindMarkdownContentInteractions 集成绑定轮播", () => {
    const { container } = setupGallery();
    const cleanup = bindMarkdownContentInteractions(container);
    container.querySelector<HTMLButtonElement>(".md-gallery-next")?.click();
    expect(container.querySelector(".md-gallery-counter")?.textContent).toBe("2/2");
    cleanup();
  });
});
