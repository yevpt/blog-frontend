import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FeaturedCarousel } from "./featured-carousel";
import type { FeaturedPost } from "../../app/_mock/types";

// Mock next/image：渲染为普通 <img>
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

// Mock next/link：渲染为普通 <a>
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

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// 测试用 mock 数据
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
  it("渲染不崩溃，显示第一张幻灯片标题", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    // 第一张幻灯片的标题存在于 DOM 中
    expect(screen.getByText("第一篇文章标题")).toBeTruthy();
  });

  it("渲染所有幻灯片（DOM 中存在所有标题）", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByText("第一篇文章标题")).toBeTruthy();
    expect(screen.getByText("第二篇文章标题")).toBeTruthy();
    expect(screen.getByText("第三篇文章标题")).toBeTruthy();
  });

  it("渲染正确数量的指示器按钮", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    // 每个幻灯片对应一个 droplet-filled 图标
    const indicators = screen.getAllByTestId("icon-droplet-filled");
    expect(indicators).toHaveLength(mockPosts.length);
  });

  it("指示器按钮具有正确的 aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByLabelText("第 1 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 2 张，共 3 张")).toBeTruthy();
    expect(screen.getByLabelText("第 3 张，共 3 张")).toBeTruthy();
  });

  it("轮播容器具有正确的无障碍 role 和 aria-label", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    expect(screen.getByRole("region", { name: "推荐文章" })).toBeTruthy();
  });

  it("阅读全文 CTA 渲染为单一链接，不嵌套 button", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const link = screen.getByRole("link", { name: "阅读全文" });

    expect(link).toHaveAttribute("href", "/articles/first");
    expect(link.querySelector("button")).toBeNull();
  });

  it("posts 为空时不渲染", () => {
    const { container } = render(<FeaturedCarousel posts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("初始状态：第一个指示器为 current，其余不是", () => {
    render(<FeaturedCarousel posts={mockPosts} />);
    const btn1 = screen.getByLabelText("第 1 张，共 3 张");
    const btn2 = screen.getByLabelText("第 2 张，共 3 张");
    const btn3 = screen.getByLabelText("第 3 张，共 3 张");
    expect(btn1).toHaveAttribute("aria-current", "true");
    expect(btn2).not.toHaveAttribute("aria-current");
    expect(btn3).not.toHaveAttribute("aria-current");
  });

  it("点击第二个指示器切换到第二张幻灯片", async () => {
    const user = userEvent.setup();
    render(<FeaturedCarousel posts={mockPosts} />);

    const btn2 = screen.getByLabelText("第 2 张，共 3 张");

    await act(async () => {
      await user.click(btn2);
    });

    // 第二个指示器变为 current
    expect(btn2).toHaveAttribute("aria-current", "true");
    const btn1 = screen.getByLabelText("第 1 张，共 3 张");
    expect(btn1).not.toHaveAttribute("aria-current");
  });

  it("点击第三个指示器切换到第三张幻灯片", async () => {
    const user = userEvent.setup();
    render(<FeaturedCarousel posts={mockPosts} />);

    const btn3 = screen.getByLabelText("第 3 张，共 3 张");

    await act(async () => {
      await user.click(btn3);
    });

    expect(btn3).toHaveAttribute("aria-current", "true");
  });
});

describe("FeaturedCarousel 自动轮播（fake timers）", () => {
  it("自动轮播：4 秒后切换到第二张幻灯片", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);

    const btn1 = screen.getByLabelText("第 1 张，共 3 张");
    expect(btn1).toHaveAttribute("aria-current", "true");

    // 推进 4 秒，触发自动切换
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const btn2 = screen.getByLabelText("第 2 张，共 3 张");
    expect(btn2).toHaveAttribute("aria-current", "true");
    expect(btn1).not.toHaveAttribute("aria-current");
  });

  it("自动轮播：8 秒后切换到第三张幻灯片", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    const btn3 = screen.getByLabelText("第 3 张，共 3 张");
    expect(btn3).toHaveAttribute("aria-current", "true");
  });

  it("自动轮播：12 秒后循环回到第一张", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    const btn1 = screen.getByLabelText("第 1 张，共 3 张");
    expect(btn1).toHaveAttribute("aria-current", "true");
  });

  it("悬停时暂停自动轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);

    const carousel = screen.getByRole("region", { name: "推荐文章" });
    const btn1 = screen.getByLabelText("第 1 张，共 3 张");

    // 模拟鼠标悬停
    act(() => {
      fireEvent.mouseEnter(carousel);
    });

    // 推进 4 秒（正常情况下会切换，但悬停应暂停）
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // 悬停期间不切换，仍为第一张
    expect(btn1).toHaveAttribute("aria-current", "true");
  });

  it("悬停结束后恢复自动轮播", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel posts={mockPosts} />);

    const carousel = screen.getByRole("region", { name: "推荐文章" });

    // 先悬停，让 React 提交 hover 状态
    act(() => {
      fireEvent.mouseEnter(carousel);
    });

    // 悬停期间推进 5 秒（应不切换）
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const btn1 = screen.getByLabelText("第 1 张，共 3 张");
    expect(btn1).toHaveAttribute("aria-current", "true");

    // 离开悬停，让 React 提交状态（启动新 interval）
    act(() => {
      fireEvent.mouseLeave(carousel);
    });

    // 再推进 4 秒，interval 应触发切换
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const btn2 = screen.getByLabelText("第 2 张，共 3 张");
    expect(btn2).toHaveAttribute("aria-current", "true");
  });
});
