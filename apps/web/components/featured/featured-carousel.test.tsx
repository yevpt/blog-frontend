import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FeaturedCarousel } from "./featured-carousel";
import type { FeaturedPost } from "../../app/_mock/types";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    priority: _priority,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    priority?: boolean;
    className?: string;
  }) => <img src={src} alt={alt} className={className} />,
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

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    href,
    children,
    className,
  }: {
    href?: string;
    children: ReactNode;
    className?: string;
    variant?: string;
    size?: string;
  }) =>
    href ? (
      <a href={href} className={className}>
        {children}
      </a>
    ) : (
      <button type="button" className={className}>
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
    }: {
      children: ReactNode;
      className?: string;
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
      setApi?: (api: null) => void;
      "aria-label"?: string;
      opts?: object;
    }) => {
      // 模拟 setApi(null)：jsdom 中 Embla 不初始化，故不调用 setApi
      return (
        <div
          role="region"
          aria-label={ariaLabel}
          className={className}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
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

const mockPosts: FeaturedPost[] = [
  {
    id: "1",
    title: "第一篇文章标题",
    excerpt: "第一篇文章摘要内容",
    coverImage: "https://example.com/image1.jpg",
    category: "编程",
    href: "/articles/first",
  },
  {
    id: "2",
    title: "第二篇文章标题",
    excerpt: "第二篇文章摘要内容",
    coverImage: "https://example.com/image2.jpg",
    category: "工具",
    href: "/articles/second",
  },
  {
    id: "3",
    title: "第三篇文章标题",
    excerpt: "第三篇文章摘要内容",
    coverImage: "https://example.com/image3.jpg",
    category: "文学",
    href: "/articles/third",
  },
];

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
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

  it("渲染正确数量的指示器按钮", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const indicators = screen.getAllByTestId("icon-droplet-filled");
    expect(indicators).toHaveLength(mockPosts.length);
  });

  it("指示器按钮具有正确的 aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 2 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 3 张，共 3 张")).toBeTruthy();
  });

  it("轮播容器具有正确的 region aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByRole("region", { name: "推荐文章" })).toBeTruthy();
  });

  it("移动端文字区的阅读文章图标链接 href 正确", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const links = screen.getAllByRole("link", { name: "阅读文章" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links.some((l) => l.getAttribute("href") === "/articles/first")).toBe(true);
  });

  it("posts 为空时不渲染", () => {
    const { container } = render(<FeaturedCarousel posts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("初始状态：第一个指示器为 current", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("第 2 张，共 3 张")).not.toHaveAttribute("aria-current");
  });

  it("点击第二个指示器切换到第二张幻灯片", async () => {
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
  it("自动轮播：4 秒后切换到第二张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("自动轮播：8 秒后切换到第三张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByLabelText("第 3 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("自动轮播：12 秒后循环回到第一张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("悬停时暂停自动轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    act(() => {
      fireEvent.mouseEnter(screen.getByRole("region", { name: "推荐文章" }));
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByLabelText("第 1 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });

  it("悬停结束后恢复自动轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);
    const carousel = screen.getByRole("region", { name: "推荐文章" });
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
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByLabelText("第 2 张，共 3 张")).toHaveAttribute("aria-current", "true");
  });
});
