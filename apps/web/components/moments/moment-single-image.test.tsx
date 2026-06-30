import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type * as RepoUI from "@repo/ui";
import { MomentSingleImage } from "./moment-single-image";

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof RepoUI;
  return {
    ...actual,
    CdnResponsiveImage: ({
      src,
      alt,
      fill,
      onImageLoad,
    }: {
      src: string;
      alt: string;
      fill?: boolean;
      onImageLoad?: (image: HTMLImageElement) => void;
    }) => (
      <img
        data-testid="cdn-responsive"
        src={src}
        alt={alt}
        data-fill={fill ?? false}
        onLoad={(event) => onImageLoad?.(event.currentTarget)}
      />
    ),
  };
});

vi.mock("@/components/common/loading-image", () => ({
  DeferredNativeImage: ({
    src,
    alt,
    defer,
    layout,
    onImageLoad,
  }: {
    src: string;
    alt: string;
    defer?: boolean;
    layout?: string;
    onImageLoad?: (image: HTMLImageElement) => void;
  }) => (
    <img
      data-testid="deferred-native"
      src={src}
      alt={alt}
      data-defer={defer ?? true}
      data-layout={layout ?? "intrinsic"}
      onLoad={(event) => onImageLoad?.(event.currentTarget)}
    />
  ),
}));

describe("MomentSingleImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("加载完成前使用最大展示框作为默认占位", () => {
    render(<MomentSingleImage src="/photo.jpg" alt="photo" />);

    const frame = screen.getByTestId("moment-single-image-frame");
    expect(frame).toHaveStyle({ maxWidth: "480px", aspectRatio: "480 / 320" });
    expect(screen.getByTestId("cdn-responsive")).toHaveAttribute("data-fill", "true");
  });

  it("展示图 onLoad 后锁定 object-contain 框", () => {
    render(<MomentSingleImage src="/photo.jpg" alt="photo" />);

    const image = screen.getByTestId("cdn-responsive");
    Object.defineProperty(image, "naturalWidth", { value: 1600, configurable: true });
    Object.defineProperty(image, "naturalHeight", { value: 900, configurable: true });
    fireEvent.load(image);

    const frame = screen.getByTestId("moment-single-image-frame");
    expect(frame).toHaveStyle({ maxWidth: "480px", aspectRatio: "480 / 270" });
  });

  it("GIF 单图走 DeferredNativeImage 且铺满展示框", () => {
    render(<MomentSingleImage src="/motion.gif" alt="motion" deferGif />);

    const img = screen.getByTestId("deferred-native");
    expect(img).toHaveAttribute("data-layout", "fill");
    expect(img).toHaveAttribute("src", "/motion.gif");
  });
});
