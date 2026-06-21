import { forwardRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LoadingImage } from "./loading-image";

// next/image mock 需转发 ref，组件才能读取底层 <img> 的 complete/naturalWidth。
vi.mock("next/image", () => ({
  default: forwardRef<
    HTMLImageElement,
    {
      src: string;
      alt: string;
      className?: string;
      onLoad?: () => void;
      onError?: () => void;
    }
  >(function MockImage({ src, alt, className, onLoad, onError }, ref) {
    return (
      <img ref={ref} src={src} alt={alt} className={className} onLoad={onLoad} onError={onError} />
    );
  }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// 控制 jsdom 下 <img> 的 complete/naturalWidth（默认 false，模拟尚未加载）。
let mockComplete = false;
let mockNaturalWidth = 0;
const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");
const originalNaturalWidth = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  "naturalWidth",
);

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
});

describe("LoadingImage", () => {
  it("图片加载前显示动态骨架屏", () => {
    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill />);

    const skeleton = screen.getByTestId("loading-image-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass("bg-muted");
    expect(skeleton).toHaveClass("loading-image-skeleton");
    expect(skeleton).not.toHaveClass("animate-pulse");
  });

  it("图片加载完成后隐藏骨架屏并显示图片", () => {
    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill />);

    fireEvent.load(screen.getByRole("img", { name: "封面" }));

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
  });

  it("图片加载失败后显示图片占位", () => {
    render(<LoadingImage src="https://example.com/broken.jpg" alt="封面" fill />);

    fireEvent.error(screen.getByRole("img", { name: "封面" }));

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading-image-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("icon-image")).toBeInTheDocument();
  });

  // 回归用例：bfcache 恢复 / 缓存命中导致挂载即 complete 时，onLoad 不会触发，
  // 组件须通过 img.complete 主动揭示，避免骨架屏永久卡住。
  it("挂载时图片已缓存（complete）则直接显示且不留骨架屏", () => {
    mockComplete = true;
    mockNaturalWidth = 800;

    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill />);

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
  });

  it("挂载时已 complete 但 naturalWidth 为 0（加载失败）则显示占位", () => {
    mockComplete = true;
    mockNaturalWidth = 0;

    render(<LoadingImage src="https://example.com/broken.jpg" alt="封面" fill />);

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading-image-fallback")).toBeInTheDocument();
  });

  it("透传 className 到图片元素", () => {
    render(
      <LoadingImage src="https://example.com/cover.jpg" alt="封面" fill className="object-cover" />,
    );

    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("object-cover");
  });
});
