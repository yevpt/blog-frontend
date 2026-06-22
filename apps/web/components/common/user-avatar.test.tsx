import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserAvatar } from "./user-avatar";

const imageMockState = vi.hoisted(() => ({
  completeOnMount: false,
}));

vi.mock("next/image", async () => {
  const React = await vi.importActual<typeof import("react")>("react"); // eslint-disable-line @typescript-eslint/consistent-type-imports

  return {
    default: React.forwardRef<
      HTMLImageElement,
      {
        src: string;
        alt: string;
        className?: string;
        unoptimized?: boolean;
        onLoad?: () => void;
        onError?: () => void;
      }
    >(function MockImage({ src, alt, className, unoptimized, onLoad, onError }, ref) {
      return (
        <img
          ref={(node) => {
            if (node) {
              Object.defineProperty(node, "complete", {
                configurable: true,
                value: imageMockState.completeOnMount,
              });
              Object.defineProperty(node, "naturalWidth", {
                configurable: true,
                value: imageMockState.completeOnMount ? 48 : 0,
              });
            }

            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          src={src}
          alt={alt}
          className={className}
          data-unoptimized={unoptimized ?? false}
          onLoad={onLoad}
          onError={onError}
        />
      );
    }),
  };
});

describe("UserAvatar", () => {
  beforeEach(() => {
    imageMockState.completeOnMount = false;
  });

  it("有 src 时渲染 img 元素", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("头像图设为 unoptimized 跳过 Next.js 优化器", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute("data-unoptimized", "true");
  });

  it("有 src 时加载前显示首字母占位，加载完成后图片淡入", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);

    expect(screen.getByTestId("user-avatar-placeholder")).toHaveTextContent("A");
    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-0");

    fireEvent.load(screen.getByRole("img", { name: "Alice" }));

    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-100");
    expect(screen.getByTestId("user-avatar-placeholder")).toHaveClass("opacity-0");
  });

  it("src 变化后重新显示加载占位", () => {
    const { rerender } = render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);

    fireEvent.load(screen.getByRole("img", { name: "Alice" }));
    rerender(<UserAvatar src="https://example.com/b.jpg" name="Alice" />);

    expect(screen.getByTestId("user-avatar-placeholder")).toHaveClass("opacity-100");
    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-0");
  });

  it("图片已从缓存完成加载时无需等待 load 事件", () => {
    imageMockState.completeOnMount = true;

    render(<UserAvatar src="https://example.com/cached.jpg" name="Alice" />);

    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-100");
    expect(screen.getByTestId("user-avatar-placeholder")).toHaveClass("opacity-0");
  });

  it("无 src 时渲染首字母大写", () => {
    render(<UserAvatar name="bob" />);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("img 加载失败时回退到首字母", () => {
    render(<UserAvatar src="https://broken.url/img.jpg" name="Charlie" />);
    fireEvent.error(screen.getByRole("img", { name: "Charlie" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("name 为空字符串时显示 ?", () => {
    render(<UserAvatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("size=xs 应用 h-5 w-5", () => {
    const { container } = render(<UserAvatar name="D" size="xs" />);
    expect(container.firstChild).toHaveClass("h-5");
    expect(container.firstChild).toHaveClass("w-5");
  });

  it("size=md 应用 h-7 w-7（默认）", () => {
    const { container } = render(<UserAvatar name="D" />);
    expect(container.firstChild).toHaveClass("h-7");
    expect(container.firstChild).toHaveClass("w-7");
  });

  it("size=ml 应用 30px", () => {
    const { container } = render(<UserAvatar name="D" size="ml" />);
    expect(container.firstChild).toHaveClass("h-[30px]");
    expect(container.firstChild).toHaveClass("w-[30px]");
  });
});
