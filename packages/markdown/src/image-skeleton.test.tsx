import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import {
  MD_IMAGE_LOADED_ATTR,
  MD_IMAGE_PENDING_ATTR,
  MD_IMAGE_SKELETON_CLASS,
  MD_IMAGE_WRAPPER_CLASS,
  bindMarkdownImageSkeletons,
  wrapMarkdownImagesWithSkeletonHtml,
} from "./image-skeleton";

let mockComplete = false;
let mockNaturalWidth = 0;
const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");
const originalNaturalWidth = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  "naturalWidth",
);

describe("wrapMarkdownImagesWithSkeletonHtml", () => {
  it("为 img 标签注入骨架包裹结构", () => {
    const html = wrapMarkdownImagesWithSkeletonHtml(
      '<p><img src="https://example.com/a.jpg" alt="图"></p>',
      "article",
    );

    expect(html).toContain(`class="${MD_IMAGE_WRAPPER_CLASS}`);
    expect(html).toContain("md-image-wrapper--article");
    expect(html).toContain(MD_IMAGE_PENDING_ATTR);
    expect(html).toContain(MD_IMAGE_SKELETON_CLASS);
    expect(html).toContain('class="md-image-pending"');
    expect(html).toContain('data-md-image-wrapped="true"');
  });

  it("comment variant 使用紧凑占位类", () => {
    const html = wrapMarkdownImagesWithSkeletonHtml(
      '<img src="https://example.com/a.jpg" alt="图">',
      "comment",
    );
    expect(html).toContain("md-image-wrapper--comment");
    expect(html).not.toContain("md-image-wrapper--article");
  });

  it("已包裹的图片不重复处理", () => {
    const once = wrapMarkdownImagesWithSkeletonHtml('<img src="a.jpg" alt="图">');
    const twice = wrapMarkdownImagesWithSkeletonHtml(once);
    expect(twice.match(/<img\b/g)?.length).toBe(1);
    expect(twice.match(/<span class="md-image-wrapper /g)?.length).toBe(1);
  });

  it("保留 img 原有 class", () => {
    const html = wrapMarkdownImagesWithSkeletonHtml('<img class="rounded" src="a.jpg" alt="图">');
    expect(html).toContain('class="rounded md-image-pending"');
  });
});

describe("bindMarkdownImageSkeletons", () => {
  beforeEach(() => {
    mockComplete = false;
    mockNaturalWidth = 0;
    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => mockComplete,
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get: () => mockNaturalWidth,
    });
  });

  afterEach(() => {
    if (originalComplete)
      Object.defineProperty(HTMLImageElement.prototype, "complete", originalComplete);
    if (originalNaturalWidth)
      Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", originalNaturalWidth);
    vi.restoreAllMocks();
  });

  it("加载完成后移除骨架屏", () => {
    const html = wrapMarkdownImagesWithSkeletonHtml(
      '<img src="https://example.com/a.jpg" alt="图">',
    );
    const { container } = render(<div dangerouslySetInnerHTML={{ __html: html }} />);
    const root = container.firstElementChild as HTMLElement;

    bindMarkdownImageSkeletons(root);

    const img = root.querySelector("img") as HTMLImageElement;
    const wrapper = root.querySelector(`.${MD_IMAGE_WRAPPER_CLASS}`) as HTMLElement;
    fireEvent.load(img);

    expect(root.querySelector(`.${MD_IMAGE_SKELETON_CLASS}`)).toBeNull();
    expect(img).not.toHaveClass("md-image-pending");
    expect(wrapper).toHaveAttribute(MD_IMAGE_LOADED_ATTR, "true");
  });

  it("加载失败时保持骨架屏", () => {
    const html = wrapMarkdownImagesWithSkeletonHtml(
      '<img src="https://example.com/broken.jpg" alt="图">',
    );
    const { container } = render(<div dangerouslySetInnerHTML={{ __html: html }} />);
    const root = container.firstElementChild as HTMLElement;
    bindMarkdownImageSkeletons(root);

    const img = root.querySelector("img") as HTMLImageElement;
    fireEvent.error(img);

    expect(root.querySelector(`.${MD_IMAGE_SKELETON_CLASS}`)).toBeInTheDocument();
    expect(img).toHaveClass("md-image-pending");
  });

  it("已缓存成功的图片直接显示", () => {
    mockComplete = true;
    mockNaturalWidth = 800;

    const html = wrapMarkdownImagesWithSkeletonHtml(
      '<img src="https://example.com/cached.jpg" alt="缓存图">',
    );
    const { container } = render(<div dangerouslySetInnerHTML={{ __html: html }} />);
    const root = container.firstElementChild as HTMLElement;
    bindMarkdownImageSkeletons(root);

    expect(root.querySelector(`.${MD_IMAGE_SKELETON_CLASS}`)).toBeNull();
    expect(root.querySelector("img")).not.toHaveClass("md-image-pending");
  });
});
