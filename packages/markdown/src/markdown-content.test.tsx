import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent", () => {
  it("渲染 html prop 的内容", () => {
    render(<MarkdownContent html="<p>hello world</p>" />);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("article variant（默认）包含 prose 和 prose-neutral 类", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="article" />);
    expect(container.firstChild).toHaveClass("prose", "prose-neutral");
    expect(container.firstChild).toHaveClass("prose-blockquote:quotes-none");
  });

  it("article variant 显式使用文章正文排版节奏", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="article" />);
    const className = container.firstElementChild?.className ?? "";

    expect(className).toContain("prose-p:leading-[1.85]");
    expect(className).toContain("prose-h1:mt-[1.25em]");
    expect(className).toContain("[&_.md-code-wrapper]:my-8");
  });

  it("comment variant 包含 prose 和 prose-sm 类", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="comment" />);
    expect(container.firstChild).toHaveClass("prose", "prose-sm");
  });

  it("comment variant 不包含 inline 类（修复旧 MarkdownText 的布局崩溃问题）", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="comment" />);
    expect(container.firstChild).not.toHaveClass("inline");
  });

  it("未传 variant 时默认使用 article 样式", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" />);
    expect(container.firstChild).toHaveClass("prose-neutral");
  });

  it("className prop 追加到根元素", () => {
    const { container } = render(
      <MarkdownContent html="<p>test</p>" className="my-custom-class" />,
    );
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("html 为空字符串时不崩溃", () => {
    expect(() => render(<MarkdownContent html="" />)).not.toThrow();
  });
});

describe("复制按钮", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  it("点击 .md-copy-btn 调用 navigator.clipboard.writeText", async () => {
    const html = `<div class="md-code-wrapper"><button class="md-copy-btn" type="button" aria-label="复制代码"><svg></svg></button><pre><code>const x = 1</code></pre></div>`;
    const { container } = render(<MarkdownContent html={html} />);

    const btn = container.querySelector(".md-copy-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("const x = 1");
  });

  it("点击复制按钮后按钮颜色变绿，2 秒后恢复", async () => {
    vi.useFakeTimers();
    const html = `<div class="md-code-wrapper"><button class="md-copy-btn" type="button" aria-label="复制代码"><svg></svg></button><pre><code>hello</code></pre></div>`;
    const { container } = render(<MarkdownContent html={html} />);

    const btn = container.querySelector(".md-copy-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(btn.style.color).toBe("rgb(22, 163, 74)");

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(btn.style.color).toBe("");

    vi.useRealTimers();
  });
});

describe("MarkdownContent 图片预览", () => {
  it("点击图片以 (images, index) 调用 onImagePreview", () => {
    const onImagePreview = vi.fn();
    const html = '<p><img src="x.jpg" alt="第一张"><img src="y.jpg" alt="第二张"></p>';
    render(<MarkdownContent html={html} onImagePreview={onImagePreview} />);
    const first = screen.getByAltText("第一张") as HTMLImageElement;
    const second = screen.getByAltText("第二张") as HTMLImageElement;
    // jsdom 会把相对 src 解析为绝对 URL，断言用元素实际暴露的 src 而非原始属性
    fireEvent.click(second);
    expect(onImagePreview).toHaveBeenCalledWith(
      [
        { src: first.currentSrc || first.src, alt: "第一张" },
        { src: second.currentSrc || second.src, alt: "第二张" },
      ],
      1,
    );
  });

  it("未传 onImagePreview 时点击图片不报错", () => {
    const html = '<p><img src="x.jpg" alt="图"></p>';
    render(<MarkdownContent html={html} />);
    expect(() => fireEvent.click(screen.getByAltText("图"))).not.toThrow();
  });

  it("优化图片点击预览时使用原图地址", () => {
    const onImagePreview = vi.fn();
    const original = "https://blog-oss.yevpt.com/original.jpg";
    render(
      <MarkdownContent
        html={`<img src="/_next/image?url=x&w=640&q=75" data-original-src="${original}" data-md-image-optimized="true" alt="图">`}
        onImagePreview={onImagePreview}
      />,
    );
    fireEvent.click(screen.getByAltText("图"));
    expect(onImagePreview).toHaveBeenCalledWith([{ src: original, alt: "图" }], 0);
  });
});

describe("MarkdownContent 图片加载失败", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("comment 模式下加载失败替换为占位图标", () => {
    const html = '<p><img src="https://example.com/broken.jpg" alt="坏图"></p>';
    const { container } = render(<MarkdownContent html={html} variant="comment" />);
    const img = screen.getByAltText("坏图") as HTMLImageElement;
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".md-image-fallback")).toBeInTheDocument();
  });

  it("优化地址失败重试三次后回退原图，原图失败后才显示占位", () => {
    vi.useFakeTimers();
    const original = "https://blog-oss.yevpt.com/original.jpg";
    const { container } = render(
      <MarkdownContent
        variant="comment"
        html={`<img src="/_next/image?url=x&w=640&q=75" data-original-src="${original}" data-md-image-optimized="true" alt="图">`}
      />,
    );
    const image = screen.getByAltText("图") as HTMLImageElement;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      fireEvent.error(image);
      act(() => vi.advanceTimersByTime(1500));
      expect(image.src).toContain(`md_retry=${attempt}`);
    }
    fireEvent.error(image);
    expect(image.src).toBe(original);
    expect(container.querySelector(".md-image-fallback")).toBeNull();

    fireEvent.error(image);
    expect(container.querySelector(".md-image-fallback")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("effect 绑定时已失败的优化图自动重试并最终回退", () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
    const original = "https://blog-oss.yevpt.com/original.jpg";
    const { container } = render(
      <MarkdownContent
        variant="comment"
        html={`<img src="/_next/image?url=x&w=640&q=75" data-original-src="${original}" data-md-image-optimized="true" alt="预加载失败图">`}
      />,
    );
    const image = screen.getByAltText("预加载失败图") as HTMLImageElement;

    act(() => {
      vi.advanceTimersByTime(0);
    });
    act(() => vi.advanceTimersByTime(1500));
    expect(image.src).toContain("md_retry=1");

    for (let attempt = 2; attempt <= 3; attempt += 1) {
      fireEvent.error(image);
      act(() => vi.advanceTimersByTime(1500));
      expect(image.src).toContain(`md_retry=${attempt}`);
    }

    fireEvent.error(image);
    expect(image.src).toBe(original);
    expect(container.querySelector(".md-image-fallback")).toBeNull();

    fireEvent.error(image);
    expect(container.querySelector(".md-image-fallback")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
