import { describe, it, expect, beforeEach } from "vitest";
import { useImageViewer } from "./use-image-viewer";

const imgs = [
  { src: "a.jpg", alt: "A" },
  { src: "b.jpg", alt: "B" },
];

beforeEach(() => {
  useImageViewer.setState({ isOpen: false, images: [], index: 0 });
});

describe("useImageViewer", () => {
  it("open 设置图片与索引并打开", () => {
    useImageViewer.getState().open(imgs, 1);
    const s = useImageViewer.getState();
    expect(s.isOpen).toBe(true);
    expect(s.images).toHaveLength(2);
    expect(s.index).toBe(1);
  });

  it("open 空数组不打开", () => {
    useImageViewer.getState().open([], 0);
    expect(useImageViewer.getState().isOpen).toBe(false);
  });

  it("open 越界索引被钳制", () => {
    useImageViewer.getState().open(imgs, 9);
    expect(useImageViewer.getState().index).toBe(1);
  });

  it("setIndex 钳制到有效范围", () => {
    useImageViewer.getState().open(imgs, 0);
    useImageViewer.getState().setIndex(-3);
    expect(useImageViewer.getState().index).toBe(0);
  });

  it("close 关闭", () => {
    useImageViewer.getState().open(imgs, 0);
    useImageViewer.getState().close();
    expect(useImageViewer.getState().isOpen).toBe(false);
  });
});
