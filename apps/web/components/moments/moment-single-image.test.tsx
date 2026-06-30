import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MomentSingleImage } from "./moment-single-image";

const mockUseMomentSingleImageDisplaySize = vi.fn();

vi.mock("@/hooks/use-moment-single-image-display-size", () => ({
  useMomentSingleImageDisplaySize: (src: string) => mockUseMomentSingleImageDisplaySize(src),
}));

vi.mock("@/components/common/loading-image", () => ({
  DeferredNativeImage: ({
    src,
    alt,
    defer,
    layout,
  }: {
    src: string;
    alt: string;
    defer?: boolean;
    layout?: string;
  }) => (
    <img
      data-testid="deferred-native"
      src={src}
      alt={alt}
      data-defer={defer ?? true}
      data-layout={layout ?? "intrinsic"}
    />
  ),
  LoadingImage: ({ src, alt, fill }: { src: string; alt: string; fill?: boolean }) => (
    <img data-testid="loading-image" src={src} alt={alt} data-fill={fill ?? false} />
  ),
}));

describe("MomentSingleImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMomentSingleImageDisplaySize.mockReturnValue({ width: 480, height: 270 });
  });

  it("探测到尺寸后锁定展示框宽高比", () => {
    render(<MomentSingleImage src="/photo.jpg" alt="photo" />);

    const frame = screen.getByTestId("moment-single-image-frame");
    expect(frame).toHaveStyle({ maxWidth: "480px", aspectRatio: "480 / 270" });
    expect(screen.getByTestId("loading-image")).toHaveAttribute("data-fill", "true");
  });

  it("探测完成前使用最大展示框作为默认占位", () => {
    mockUseMomentSingleImageDisplaySize.mockReturnValue(null);

    render(<MomentSingleImage src="/photo.jpg" alt="photo" />);

    const frame = screen.getByTestId("moment-single-image-frame");
    expect(frame).toHaveStyle({ maxWidth: "480px", aspectRatio: "480 / 320" });
  });

  it("GIF 单图走 DeferredNativeImage 且铺满展示框", () => {
    render(<MomentSingleImage src="/motion.gif" alt="motion" deferGif />);

    const img = screen.getByTestId("deferred-native");
    expect(img).toHaveAttribute("data-layout", "fill");
    expect(img).toHaveAttribute("src", "/motion.gif");
  });
});
