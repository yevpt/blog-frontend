import { forwardRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type * as RepoHooks from "@repo/hooks";
import { LoadingImage } from "./loading-image";

const IMAGE_PLACEHOLDER_DELAY_MS = 200;

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

// next/image mock 需转发 ref，组件才能读取底层 <img> 的 complete/naturalWidth。
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

describe("LoadingImage", () => {
  it("媒体未激活时仅渲染 defer 骨架，不挂载图片", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);

    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill />);

    expect(screen.getByTestId("loading-image-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "封面" })).not.toBeInTheDocument();
  });

  it("延迟后才显示加载骨架，避免快网白闪", async () => {
    vi.useFakeTimers();
    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill />);

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMAGE_PLACEHOLDER_DELAY_MS);
    });

    expect(screen.getByTestId("loading-image-skeleton")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("图片加载完成后隐藏骨架屏并显示图片", async () => {
    vi.useFakeTimers();
    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMAGE_PLACEHOLDER_DELAY_MS);
    });
    fireEvent.load(screen.getByRole("img", { name: "封面" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("opacity-100");
    vi.useRealTimers();
  });

  it("图片加载失败后显示图片占位", async () => {
    vi.useFakeTimers();
    render(<LoadingImage src="https://example.com/broken.jpg" alt="封面" fill />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMAGE_PLACEHOLDER_DELAY_MS);
    });

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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(screen.queryByTestId("loading-image-skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading-image-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("icon-image-off")).toBeInTheDocument();
    vi.useRealTimers();
  });

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
      await vi.advanceTimersByTimeAsync(IMAGE_PLACEHOLDER_DELAY_MS);
    });

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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMAGE_PLACEHOLDER_DELAY_MS);
    });

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

  it("defer=false 时即使媒体未激活也挂载图片", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);

    render(<LoadingImage src="https://example.com/cover.jpg" alt="封面" fill defer={false} />);

    expect(screen.getByRole("img", { name: "封面" })).toBeInTheDocument();
  });
});
