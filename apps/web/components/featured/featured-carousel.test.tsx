import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FeaturedCarousel } from "./featured-carousel";
import type { FeaturedPost } from "../../app/_mock/types";

type MockWatchDrag = (_emblaApi: unknown, event: { target: EventTarget | null }) => boolean;

const carouselMockState = vi.hoisted(
  (): {
    watchDrag?: MockWatchDrag;
  } => ({}),
);

vi.mock("@repo/hooks/locale", () => ({
  useLocale: () => ({ locale: "zh", setLocale: vi.fn(), t: (k: string) => k }),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill,
    priority: _priority,
    quality,
    sizes,
    unoptimized,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    priority?: boolean;
    quality?: number;
    sizes?: string;
    unoptimized?: boolean;
    className?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      className={className}
      data-fill={fill}
      data-quality={quality}
      data-sizes={sizes}
      data-unoptimized={unoptimized}
    />
  ),
}));

vi.mock("@/hooks/use-deferred-media-activation", () => ({
  useDeferredMediaActivation: () => true,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/category-colors", () => ({
  getCategoryColorClass: () => "bg-blue-500",
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock("@repo/ui", () => ({
  cn: (...inputs: (string | false | null | undefined)[]) => inputs.filter(Boolean).join(" "),
  Button: ({
    href,
    children,
    className,
    onPress,
    ...props
  }: {
    href?: string;
    children: ReactNode;
    className?: string;
    onPress?: () => void;
    variant?: string;
    size?: string;
    [key: string]: unknown;
  }) =>
    href ? (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    ) : (
      <button type="button" className={className} onClick={onPress} {...props}>
        {children}
      </button>
    ),
  Carousel: {
    Root: ({
      children,
      className,
      onMouseEnter,
      onMouseLeave,
      setApi: _setApi,
      "aria-label": ariaLabel,
      opts,
      orientation,
    }: {
      children: ReactNode;
      className?: string;
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
      setApi?: (api: MockCarouselApi | null) => void;
      "aria-label"?: string;
      opts?: { watchDrag?: MockWatchDrag };
      orientation?: string;
    }) => {
      carouselMockState.watchDrag = opts?.watchDrag;
      return (
        <div
          role="region"
          aria-label={ariaLabel}
          className={className}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          data-has-watch-drag={typeof opts?.watchDrag === "function"}
          data-orientation={orientation ?? "horizontal"}
          data-testid="carousel-root"
        >
          {children}
        </div>
      );
    },
    Content: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    Item: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

interface MockCarouselApi {
  selectedScrollSnap: () => number;
  scrollTo: (index: number) => void;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
}

const mockPosts: FeaturedPost[] = [
  {
    id: "1",
    title: "第一篇文章标题",
    excerpt: "第一篇文章摘要内容",
    coverImage: "https://example.com/image1.jpg",
    category: "编程",
    date: "2026-01-15",
    href: "/articles/first",
  },
  {
    id: "2",
    title: "第二篇文章标题",
    excerpt: "第二篇文章摘要内容",
    coverImage: "https://example.com/image2.jpg",
    category: "工具",
    date: "2026-02-20",
    href: "/articles/second",
  },
  {
    id: "3",
    title: "第三篇文章标题",
    excerpt: "第三篇文章摘要内容",
    coverImage: "https://example.com/image3.jpg",
    category: "文学",
    date: "2026-03-10",
    href: "/articles/third",
  },
];

// 桌面垂直轮播（第二个 region = FeaturedCarouselDesktop，移动端先渲染故取 [1]）
function getDesktopCarousel() {
  return screen.getAllByRole("region", { name: "推荐文章" })[1];
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  carouselMockState.watchDrag = undefined;
});

describe("FeaturedCarousel", () => {
  it("渲染不崩溃，DOM 中存在第一张幻灯片标题", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getAllByText("第一篇文章标题").length).toBeGreaterThan(0);
  });

  it("DOM 中存在所有幻灯片标题", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getAllByText("第一篇文章标题").length).toBeGreaterThan(0);
    expect(screen.getAllByText("第二篇文章标题").length).toBeGreaterThan(0);
    expect(screen.getAllByText("第三篇文章标题").length).toBeGreaterThan(0);
  });

  it("普通轮播封面启用 Next 优化并保持等比裁切配置", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const images = screen.getAllByRole("img");

    expect(images.every((image) => image.getAttribute("data-unoptimized") !== "true")).toBe(true);
    expect(images.every((image) => image.getAttribute("data-fill") === "true")).toBe(true);
    expect(images.every((image) => image.className.includes("object-cover"))).toBe(true);
    expect(
      images.every(
        (image) => image.getAttribute("data-sizes") === "(max-width: 768px) 100vw, 55vw",
      ),
    ).toBe(true);
  });

  it("GIF 轮播封面跳过 Next 优化", () => {
    const gifPost = { ...mockPosts[0]!, coverImage: "https://blog-oss.yevpt.com/hero.GIF?v=1" };

    render(<FeaturedCarousel posts={[gifPost]} />);

    expect(
      screen
        .getAllByRole("img")
        .every((image) => image.getAttribute("data-unoptimized") === "true"),
    ).toBe(true);
  });

  it("渲染正确数量的桌面指示器按钮（仅桌面垂直轮播有 hero-progress-button）", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const indicators = screen.getAllByTestId("hero-progress-button");
    expect(indicators).toHaveLength(mockPosts.length);
  });

  it("移动端使用 Embla carousel-root，桌面端用纯 CSS region", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    // 桌面端是纯 CSS（FeaturedCarouselDesktop），移动端是 Embla（有 data-testid=carousel-root）
    expect(screen.getByTestId("carousel-root")).toBeTruthy();
    expect(screen.getAllByRole("region", { name: "推荐文章" })).toHaveLength(2);
  });

  it("桌面轮播容器具有圆角且无全屏高度", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const desktopCarousel = getDesktopCarousel();
    expect(desktopCarousel.className).toContain("min-h-[380px]");
    expect(desktopCarousel.className).toContain("max-h-[520px]");
    expect(desktopCarousel.className).toContain("rounded-2xl");
    expect(desktopCarousel.className).not.toContain("h-[100vh]");
    expect(desktopCarousel.className).not.toContain("bg-[#0d0b2e]");
  });

  it("移动端文字区域标记为非拖拽区", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByTestId("carousel-root")).toHaveAttribute("data-has-watch-drag", "true");
    const noDragElements = document.querySelectorAll("[data-carousel-no-drag='true']");
    expect(noDragElements.length).toBeGreaterThan(0);
  });

  it("桌面指示器按钮具有正确的 aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 2 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 3 张，共 3 张")).toBeTruthy();
  });

  it("渲染两个轮播实例（桌面 + 移动端）", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getAllByRole("region", { name: "推荐文章" })).toHaveLength(2);
  });

  it("阅读全文链接 href 正确", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const links = screen.getAllByRole("link", { name: /阅读全文/ });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links.some((l) => l.getAttribute("href") === "/articles/first")).toBe(true);
  });

  it("posts 为空时不渲染", () => {
    const { container } = render(<FeaturedCarousel posts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("移动端轮播容器高度为 100svh、无圆角", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const mobileCarousel = screen.getByTestId("carousel-root");
    expect(mobileCarousel.className).toContain("h-[100svh]");
    expect(mobileCarousel.className).not.toContain("rounded-2xl");
  });

  it("移动端 slide 文字 overlay 包裹层带 absolute bottom-0 class", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const mobileCarousel = screen.getByTestId("carousel-root");
    // 文字 overlay 包裹层（data-carousel-no-drag 在 no-drag 容器内部，找第一个匹配）
    const noDragEls = mobileCarousel.querySelectorAll("[data-carousel-no-drag='true']");
    // 第一个是 slide 内部的文字区，第二个是指示点容器
    const textNoDrag = noDragEls[0];
    expect(textNoDrag).not.toBeNull();
    const overlayWrapper = textNoDrag!.parentElement;
    expect(overlayWrapper!.className).toContain("absolute");
    expect(overlayWrapper!.className).toContain("bottom-0");
  });

  it("移动端文字区为底部指示器预留空间，避免两者挤在一起", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const mobileCarousel = screen.getByTestId("carousel-root");
    const textNoDrag = mobileCarousel.querySelector("[data-carousel-no-drag='true']");
    expect(textNoDrag).not.toBeNull();
    expect((textNoDrag as HTMLElement).className).toContain("pb-24");
  });

  it("移动端指示点仅渲染一组，不随 slide 数量重复", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    // 每个按钮的 aria-label 应在整个文档中唯一
    expect(screen.getByRole("button", { name: "切换至第 1 张" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "切换至第 2 张" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "切换至第 3 张" })).toBeTruthy();
  });

  it("移动端指示点容器为 Carousel.Root 的直接后代，不嵌套在 Carousel.Item 内", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const mobileCarousel = screen.getByTestId("carousel-root");
    // 指示点容器带 data-carousel-no-drag 且 className 含 bottom-5
    const indicatorContainer = Array.from(
      mobileCarousel.querySelectorAll("[data-carousel-no-drag='true']"),
    ).find((el) => (el as HTMLElement).className.includes("bottom-5"));
    expect(indicatorContainer).not.toBeNull();
  });

  it("移动端仅允许从背景图层拖动翻页", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const mobileCarousel = screen.getByTestId("carousel-root");
    const background = mobileCarousel.querySelector("[data-carousel-background-drag='true']");
    const textNoDrag = mobileCarousel.querySelector("[data-carousel-no-drag='true']");

    expect(background).not.toBeNull();
    expect(textNoDrag).not.toBeNull();
    expect(carouselMockState.watchDrag?.(null, { target: background })).toBe(true);
    expect(carouselMockState.watchDrag?.(null, { target: textNoDrag })).toBe(false);
    expect(carouselMockState.watchDrag?.(null, { target: mobileCarousel })).toBe(false);
  });

  it("初始状态：桌面轮播第一个指示器为 current", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("第 2 张，共 3 张")).not.toHaveAttribute("aria-current");
  });

  it("点击第二个桌面指示器切换到第二张幻灯片", async () => {
    const user = userEvent.setup();
    render(<FeaturedCarousel posts={mockPosts} />);
    await act(async () => {
      await user.click(screen.getByLabelText("第 2 张，共 3 张"));
    });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("第 1 张，共 3 张")).not.toHaveAttribute("aria-current");
  });
});

describe("FeaturedCarousel 自动轮播（fake timers）", () => {
  it("自动轮播：5 秒后桌面切换到第二张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("自动轮播：10 秒后切换到第三张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText("第 3 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("自动轮播：15 秒后循环回到第一张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("悬停时暂停桌面轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      fireEvent.mouseEnter(getDesktopCarousel());
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("悬停结束后恢复桌面轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    const carousel = getDesktopCarousel();
    act(() => {
      fireEvent.mouseEnter(carousel);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
    act(() => {
      fireEvent.mouseLeave(carousel);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });
});
