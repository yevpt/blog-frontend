import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreviewableMarkdown } from "./previewable-markdown";
import { useImageViewer } from "@/store/use-image-viewer";

beforeEach(() => {
  useImageViewer.setState({ isOpen: false, images: [], index: 0 });
});

describe("PreviewableMarkdown", () => {
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
