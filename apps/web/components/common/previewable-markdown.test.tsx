import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreviewableMarkdown } from "./previewable-markdown";
import { useImageViewer } from "@/store/use-image-viewer";

beforeEach(() => {
  useImageViewer.setState({ isOpen: false, images: [], index: 0 });
});

describe("PreviewableMarkdown", () => {
  it("白名单图片展示优化地址但预览使用原图", () => {
    const original = "https://blog-oss.yevpt.com/posts/a.jpg";
    render(<PreviewableMarkdown html={`<p><img src="${original}" alt="封图"></p>`} />);
    const image = screen.getByAltText("封图") as HTMLImageElement;
    expect(image.src).toContain("/_next/image?url=");
    fireEvent.click(image);
    expect(useImageViewer.getState().images[0]).toEqual({ src: original, alt: "封图" });
  });

  it("GIF 保持原图直连", () => {
    const gif = "https://blog-oss.yevpt.com/posts/a.gif?v=1";
    render(<PreviewableMarkdown html={`<img src="${gif}" alt="动图">`} />);
    expect(screen.getByAltText("动图")).toHaveAttribute("src", gif);
  });

  it("点击图片打开全局预览 store", () => {
    const html = '<p><img src="z.jpg" alt="封图"></p>';
    render(<PreviewableMarkdown html={html} />);
    const img = screen.getByAltText("封图") as HTMLImageElement;
    fireEvent.click(img);
    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    // jsdom 下 img.src 会被解析为绝对 URL，断言对齐运行时实际值
    expect(s.images[0]).toEqual({ src: img.src, alt: "封图" });
    expect(s.images[0].src).toContain("z.jpg");
  });
});
