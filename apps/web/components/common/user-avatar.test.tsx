import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserAvatar } from "./user-avatar";
import { resolveInactiveMockAvatarUrl } from "@/lib/preset-avatar";

const deferredMediaMock = vi.hoisted(() => ({
  useDeferredMediaActivation: vi.fn(() => true),
}));

vi.mock("@repo/hooks", () => ({
  shouldDeferRemoteMediaSrc: (src: string | undefined) => {
    if (!src) return false;
    return !src.startsWith("data:") && !src.startsWith("blob:");
  },
  useDeferredMediaActivation: deferredMediaMock.useDeferredMediaActivation,
}));

const { useDeferredMediaActivation } = deferredMediaMock;

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

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
        priority?: boolean;
        loading?: "lazy" | "eager";
        unoptimized?: boolean;
        onLoad?: () => void;
        onError?: () => void;
      }
    >(function MockImage(
      { src, alt, className, priority, loading, unoptimized, onLoad, onError },
      ref,
    ) {
      const mountedRef = React.useRef(false);
      const prevSrc = React.useRef(src);

      if (prevSrc.current !== src) {
        prevSrc.current = src;
        mountedRef.current = false;
      }

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

            if (!mountedRef.current) {
              mountedRef.current = true;
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }
          }}
          src={src}
          alt={alt}
          className={className}
          data-unoptimized={unoptimized ?? false}
          data-priority={priority ?? false}
          data-loading={loading ?? "lazy"}
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
    vi.mocked(useDeferredMediaActivation).mockReturnValue(true);
  });

  it("媒体未激活时远程头像仅显示骨架", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    expect(screen.getByTestId("user-avatar-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Alice" })).not.toBeInTheDocument();
  });

  it("有 src 时渲染 img 元素", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("头像图为 20-64px 极小尺寸，始终 unoptimized 直连 OSS", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute("data-unoptimized", "true");
  });

  it("src 后缀为 .php 时回退到自托管 mock 头像", () => {
    render(
      <UserAvatar src="https://blog-oss.yevpt.com/avatar/a.php?a=1&b=2" userId={7} name="Alice" />,
    );
    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute(
      "src",
      resolveInactiveMockAvatarUrl(7),
    );
  });

  it("无头像且有 userId 时展示自托管 mock 肖像", () => {
    render(<UserAvatar userId={42} name="bob" />);
    expect(screen.getByRole("img", { name: "bob" })).toHaveAttribute(
      "src",
      resolveInactiveMockAvatarUrl(42),
    );
  });

  it("src 后缀为 .asp 且无 userId 时回退到首字母", () => {
    render(<UserAvatar src="https://blog-oss.yevpt.com/avatar/a.asp?a=1&b=2" name="Alice" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("src 无扩展名时放行，正常渲染 img", () => {
    render(<UserAvatar src="https://blog-oss.yevpt.com/avatar/user/abc123" name="Alice" />);
    expect(screen.getByRole("img", { name: "Alice" })).toBeInTheDocument();
  });

  it("data: URL 不受扩展名校验影响，正常渲染 img", () => {
    render(<UserAvatar src="data:image/png;base64,xx" name="Alice" />);
    expect(screen.getByRole("img", { name: "Alice" })).toBeInTheDocument();
  });

  it("priority 模式下跳过骨架延迟，直接加载且 loading 为 eager", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" priority />);
    expect(screen.getByTestId("user-avatar-skeleton")).toHaveClass("opacity-0");
    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("data-priority", "true");
    expect(img).toHaveAttribute("data-loading", "eager");
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

  it("同一 userId 的 mock 头像保持稳定", () => {
    const first = render(<UserAvatar userId={99} name="A" />);
    const firstSrc = screen.getByRole("img").getAttribute("src");
    first.unmount();
    render(<UserAvatar userId={99} name="B" />);
    expect(screen.getByRole("img").getAttribute("src")).toBe(firstSrc);
  });

  it("无 src 且无 userId 时渲染首字母大写", () => {
    render(<UserAvatar name="bob" />);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("img 加载失败且有 userId 时回退到 mock 头像", async () => {
    render(<UserAvatar src="https://broken.url/img.jpg" userId={5} name="Charlie" />);
    fireEvent.error(screen.getByRole("img", { name: "Charlie" }));
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Charlie" })).toHaveAttribute(
        "src",
        resolveInactiveMockAvatarUrl(5),
      );
    });
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

  it("isVip 时在头像左上角显示 VIP 皇冠", () => {
    render(<UserAvatar name="VipUser" isVip />);
    expect(screen.getByTestId("icon-vip")).toBeInTheDocument();
  });

  it("非 VIP 时不显示皇冠", () => {
    render(<UserAvatar name="Regular" />);
    expect(screen.queryByTestId("icon-vip")).not.toBeInTheDocument();
  });
});
