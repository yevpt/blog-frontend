import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadingImage } from "./loading-image";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    onLoad,
    onError,
  }: {
    src: string;
    alt: string;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
  }) => <img src={src} alt={alt} className={className} onLoad={onLoad} onError={onError} />,
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

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

  it("透传 className 到图片元素", () => {
    render(
      <LoadingImage src="https://example.com/cover.jpg" alt="封面" fill className="object-cover" />,
    );

    expect(screen.getByRole("img", { name: "封面" })).toHaveClass("object-cover");
  });
});
