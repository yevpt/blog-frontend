import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import {
  MD_IMAGE_DEFERRED_ATTR,
  MD_IMAGE_SRC_DATA_ATTR,
  MD_IMAGE_SRCSET_DATA_ATTR,
  MD_IMAGE_SIZES_DATA_ATTR,
  attachDeferredMarkdownImages,
  deferMarkdownImageSources,
} from "./image-deferred";

describe("deferMarkdownImageSources", () => {
  it("移除 src 并写入 data-md-src", () => {
    const html = deferMarkdownImageSources('<img src="https://example.com/a.jpg" alt="图">');
    expect(html).not.toMatch(/\ssrc=/i);
    expect(html).toContain(`${MD_IMAGE_SRC_DATA_ATTR}="https://example.com/a.jpg"`);
    expect(html).toContain(`${MD_IMAGE_DEFERRED_ATTR}="true"`);
    expect(html).toContain('loading="lazy"');
  });

  it("将 srcset/sizes 移入 data 属性", () => {
    const html = deferMarkdownImageSources(
      '<img src="https://example.com/a.jpg" srcset="/a 640w" sizes="100vw" alt="图">',
    );
    expect(html).not.toMatch(/\ssrcset=/i);
    expect(html).not.toMatch(/\ssizes=/i);
    expect(html).toContain(`${MD_IMAGE_SRCSET_DATA_ATTR}="/a 640w"`);
    expect(html).toContain(`${MD_IMAGE_SIZES_DATA_ATTR}="100vw"`);
  });

  it("已延迟处理的图片不重复改写", () => {
    const once = deferMarkdownImageSources('<img src="a.jpg" alt="图">');
    const twice = deferMarkdownImageSources(once);
    expect(twice.match(new RegExp(MD_IMAGE_SRC_DATA_ATTR, "g"))?.length).toBe(1);
  });
});

describe("attachDeferredMarkdownImages", () => {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  let observerCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class MockIntersectionObserver {
        constructor(callback: IntersectionObserverCallback) {
          observerCallback = callback;
        }
        observe = observe;
        unobserve = unobserve;
        disconnect = disconnect;
      },
    );
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
        return 1;
      }),
    );
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "complete",
    });
    observe.mockClear();
    unobserve.mockClear();
    disconnect.mockClear();
    observerCallback = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("进入视口前不设置 img.src", () => {
    const html = deferMarkdownImageSources('<img src="https://example.com/a.jpg" alt="图">');
    const { container } = render(<div dangerouslySetInnerHTML={{ __html: html }} />);
    const root = container.firstElementChild as HTMLElement;

    attachDeferredMarkdownImages(root);

    const img = root.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBeNull();
  });

  it("idle 后观察并在进入视口时激活 src", () => {
    const html = deferMarkdownImageSources(
      '<img src="https://example.com/a.jpg" data-md-srcset="/a 640w" alt="图">',
    );
    const { container } = render(<div dangerouslySetInnerHTML={{ __html: html }} />);
    const root = container.firstElementChild as HTMLElement;
    const cleanup = attachDeferredMarkdownImages(root);
    const img = root.querySelector("img") as HTMLImageElement;

    expect(observe).toHaveBeenCalledWith(img);
    expect(img.getAttribute("src")).toBeNull();

    observerCallback?.(
      [{ isIntersecting: true, target: img } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(img.src).toContain("https://example.com/a.jpg");
    expect(img.srcset).toContain("/a 640w");
    expect(img.getAttribute(MD_IMAGE_DEFERRED_ATTR)).toBeNull();
    cleanup();
  });
});
