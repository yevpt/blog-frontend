// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type * as RepoHooks from "@repo/hooks";
import { CdnResponsiveImage } from "./cdn-responsive-image";

const deferredMediaMock = vi.hoisted(() => ({
  useDeferredMediaActivation: vi.fn(() => true),
}));

vi.mock("@repo/hooks", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof RepoHooks;
  return {
    ...actual,
    useDeferredMediaActivation: deferredMediaMock.useDeferredMediaActivation,
  };
});

const { useDeferredMediaActivation } = deferredMediaMock;

let mockComplete = false;
let mockNaturalWidth = 0;
const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");
const originalNaturalWidth = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  "naturalWidth",
);

beforeEach(() => {
  vi.mocked(useDeferredMediaActivation).mockReturnValue(true);
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
});

describe("CdnResponsiveImage", () => {
  it("defer 且媒体未激活时仅渲染骨架，不挂载 img", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);

    render(
      <CdnResponsiveImage
        src="https://blog-oss.yevpt.com/blog/a.jpg?sign=1"
        alt="封面"
        preset="article-cover"
        defer
      />,
    );

    expect(screen.getByTestId("cdn-responsive-image-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "封面" })).not.toBeInTheDocument();
  });

  it("白名单地址使用 CDN 变换 src", () => {
    render(
      <CdnResponsiveImage
        src="https://blog-oss.yevpt.com/blog/a.jpg?sign=1"
        alt="封面"
        preset="thumbnail"
      />,
    );
    const image = screen.getByRole("img", { name: "封面" });
    expect(image.getAttribute("src")).toContain("w=112");
  });

  it("priority 时 eager 加载并提升 fetch 优先级", () => {
    render(
      <CdnResponsiveImage
        src="https://blog-oss.yevpt.com/blog/a.jpg?sign=1"
        alt="封面"
        preset="article-cover"
        priority
      />,
    );
    const image = screen.getByRole("img", { name: "封面" });
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
  });

  it("priority 时不显示骨架，图片保持可见", () => {
    render(
      <CdnResponsiveImage
        src="https://blog-oss.yevpt.com/blog/a.jpg?sign=1"
        alt="封面"
        preset="article-cover"
        imageMode="fixed"
        displayWidth={1080}
        priority
      />,
    );

    expect(screen.queryByTestId("cdn-responsive-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
  });

  it("解码完成前 complete 且 naturalWidth=0 不误判失败", () => {
    mockComplete = true;
    mockNaturalWidth = 0;

    render(
      <CdnResponsiveImage
        src="https://blog-oss.yevpt.com/blog/a.jpg?sign=1"
        alt="封面"
        preset="thumbnail"
      />,
    );

    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
    fireEvent.load(screen.getByRole("img", { name: "封面" }));
    expect(screen.queryByTestId("cdn-responsive-image-skeleton")).not.toBeInTheDocument();
  });

  it("缓存命中时 ref 回调直接标记 loaded，不卡在骨架屏", () => {
    mockComplete = true;
    mockNaturalWidth = 800;

    render(
      <CdnResponsiveImage
        src="https://blog-oss.yevpt.com/blog/a.jpg?sign=1"
        alt="封面"
        preset="article-cover"
        imageMode="fixed"
        displayWidth={1080}
      />,
    );

    expect(screen.queryByTestId("cdn-responsive-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
  });

  it("已加载后忽略误触发的 onError", () => {
    render(
      <CdnResponsiveImage
        src="https://blog-oss.yevpt.com/blog/a.jpg?sign=1"
        alt="封面"
        preset="thumbnail"
      />,
    );
    const image = screen.getByRole("img", { name: "封面" });
    fireEvent.load(image);
    fireEvent.error(image);

    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
    expect(screen.queryByTestId("cdn-responsive-image-skeleton")).not.toBeInTheDocument();
  });

  it("onLoad 后隐藏骨架", () => {
    render(
      <CdnResponsiveImage src="https://example.com/a.jpg" alt="外链" preset="article-cover" />,
    );
    fireEvent.load(screen.getByRole("img", { name: "外链" }));
    expect(screen.queryByTestId("cdn-responsive-image-skeleton")).not.toBeInTheDocument();
  });

  it("缓存命中且 onImageLoad 触发父重渲染时不陷入无限更新", () => {
    mockComplete = true;
    mockNaturalWidth = 800;

    function ParentWithInlineCallback() {
      const [, setSize] = useState({ w: 0, h: 0 });
      return (
        <CdnResponsiveImage
          src="https://blog-oss.yevpt.com/blog/a.jpg?sign=1"
          alt="封面"
          preset="article-cover"
          imageMode="fixed"
          displayWidth={1080}
          onImageLoad={() => setSize({ w: 800, h: 600 })}
        />
      );
    }

    expect(() => render(<ParentWithInlineCallback />)).not.toThrow();
    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
  });
});
