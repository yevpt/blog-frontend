import { forwardRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LoadingImage } from "./loading-image";

// next/image mock 需转发 ref，组件才能读取底层 <img> 的 complete/naturalWidth。
// 模拟 Next.js 真实行为：priority → loading="eager" + fetchPriority="high"
vi.mock("next/image", () => ({
  default: forwardRef<
    HTMLImageElement,
    {
      src: string;
      alt: string;
      className?: string;
      priority?: boolean;
      unoptimized?: boolean;
      fetchPriority?: "high" | "low" | "auto";
      loading?: "eager" | "lazy";
      onLoad?: () => void;
      onError?: () => void;
    }
  >(function MockImage(
    { src, alt, className, priority, unoptimized, fetchPriority, loading, onLoad, onError },
    ref,
  ) {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={className}
        loading={priority ? "eager" : loading}
        fetchPriority={priority ? "high" : fetchPriority}
        data-unoptimized={unoptimized ?? false}
        onLoad={onLoad}
        onError={onError}
      />
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

  it("图片加载失败后显示图片占位", async () => {
    vi.useFakeTimers();
    render(<LoadingImage src="https://example.com/broken.jpg" alt="封面" fill />);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await act(async () => {
        fireEvent.error(screen.getByRole("img", { name: "封面" }));
      });
      if (attempt < 3) {
        expect(screen.getByTestId("loading-image-skeleton")).toBeInTheDocument();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1500);
        });
      }
    }

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading-image-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("icon-image-off")).toBeInTheDocument();
    vi.useRealTimers();
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

  it("默认（无 priority）设置 fetchPriority=low", () => {
    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill />);

    expect(screen.getByRole("img", { name: "封面" })).toHaveAttribute("fetchpriority", "low");
  });

  it("priority 模式下不覆盖 fetchPriority，由 Next.js 设为 high 并 eager 加载", () => {
    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill priority />);

    const img = screen.getByRole("img", { name: "封面" });
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("优化器超时期间保持骨架屏，重试成功后显示图片", async () => {
    vi.useFakeTimers();
    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill />);

    await act(async () => {
      fireEvent.error(screen.getByRole("img", { name: "封面" }));
    });
    expect(screen.getByTestId("loading-image-skeleton")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await act(async () => {
      fireEvent.load(screen.getByRole("img", { name: "封面" }));
    });

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
    vi.useRealTimers();
  });

  it("fallbackUnoptimized 时优化器重试耗尽后回退为 unoptimized", async () => {
    vi.useFakeTimers();
    render(
      <LoadingImage src="https://example.com/cover.jpg" alt="封面" fill fallbackUnoptimized />,
    );

    expect(screen.getByRole("img", { name: "封面" })).toHaveAttribute("data-unoptimized", "false");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await act(async () => {
        fireEvent.error(screen.getByRole("img", { name: "封面" }));
      });
      if (attempt < 3) {
        expect(screen.getByTestId("loading-image-skeleton")).toBeInTheDocument();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1500);
        });
      }
    }

    expect(screen.getByRole("img", { name: "封面" })).toHaveAttribute("data-unoptimized", "true");
    expect(screen.getByTestId("loading-image-skeleton")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
