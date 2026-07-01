// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { NodeViewProps } from "@tiptap/core";
import { ImageNodeView } from "../nodes/image-node-view";
import { IMAGE_UPLOAD_PLACEHOLDER_SRC } from "../constants/image-upload";

function makeProps(overrides: Partial<NodeViewProps["node"]["attrs"]> = {}): NodeViewProps {
  return {
    node: {
      attrs: {
        src: IMAGE_UPLOAD_PLACEHOLDER_SRC,
        alt: "demo.png",
        uploadState: "loading",
        uploadId: "upload-1",
        aspectRatio: "1.5",
        ...overrides,
      },
    },
    selected: false,
    updateAttributes: vi.fn(),
    extension: {
      options: { imageOptimizationPreset: "off" },
    },
  } as unknown as NodeViewProps;
}

describe("ImageNodeView", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("上传中只显示 spinner 占位", () => {
    render(<ImageNodeView {...makeProps()} />);
    expect(screen.getByLabelText("图片处理中")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("decoding 态在图片 onLoad 前保持 spinner，加载后淡入并清除状态", async () => {
    vi.useFakeTimers();
    const updateAttributes = vi.fn();
    const props = makeProps({
      src: "https://cdn.example.com/photo.jpg",
      uploadState: "decoding",
      uploadId: null,
    });
    props.updateAttributes = updateAttributes;

    render(<ImageNodeView {...props} />);
    expect(screen.getByLabelText("图片加载中")).toBeInTheDocument();

    const image = screen.getByAltText("demo.png");
    await act(async () => {
      image.dispatchEvent(new Event("load"));
    });

    expect(image).toHaveClass("h-auto");
    expect(updateAttributes).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(280);
    });

    expect(updateAttributes).toHaveBeenCalledWith({
      uploadState: null,
      uploadId: null,
      aspectRatio: null,
    });
  });

  it("就绪态与 decoding 共用同一 img 节点，避免替换时抖动", async () => {
    vi.useFakeTimers();
    const updateAttributes = vi.fn();
    const props = makeProps({
      src: "https://cdn.example.com/photo.jpg",
      uploadState: "decoding",
      uploadId: null,
    });
    props.updateAttributes = updateAttributes;

    const { rerender } = render(<ImageNodeView {...props} />);
    const image = screen.getByAltText("demo.png");

    await act(async () => {
      image.dispatchEvent(new Event("load"));
      vi.advanceTimersByTime(280);
    });

    expect(updateAttributes).toHaveBeenCalledTimes(1);

    const updatedNode = {
      ...props.node,
      attrs: {
        ...props.node.attrs,
        uploadState: null,
        uploadId: null,
        aspectRatio: null,
      },
    } as unknown as typeof props.node;

    rerender(<ImageNodeView {...props} node={updatedNode} />);

    expect(screen.getByAltText("demo.png")).toBe(image);
    expect(screen.getByAltText("demo.png")).toHaveClass("h-auto");
    expect(screen.queryByLabelText("图片加载中")).not.toBeInTheDocument();
  });

  it("article 预设与详情页一致使用 responsive CDN 变换", () => {
    const props = makeProps({
      src: "https://blog-oss.yevpt.com/blog/a.jpg?sign=1",
      uploadState: null,
      uploadId: null,
      aspectRatio: null,
    });

    render(<ImageNodeView {...props} imageOptimizationPreset="article" />);

    const image = screen.getByAltText("demo.png");
    expect(image.getAttribute("src")).toContain("w=1080");
    expect(image.getAttribute("srcset")).toContain("640w");
    expect(image.getAttribute("sizes")).toContain("768px");
  });

  it("comment 预设可优化图在编辑器内使用 fixed CDN，避免 srcSet 重复请求", () => {
    const props = makeProps({
      src: "https://blog-oss.yevpt.com/blog/a.jpg?sign=1",
      uploadState: null,
      uploadId: null,
      aspectRatio: null,
    });

    render(<ImageNodeView {...props} imageOptimizationPreset="comment" />);

    const image = screen.getByAltText("demo.png");
    expect(image.getAttribute("src")).toContain("w=640");
    expect(image.getAttribute("srcset")).toBeNull();
  });

  it("comment 预设从 Markdown 回显时加载完成后可见", async () => {
    const props = makeProps({
      src: "https://cdn.example.com/photo.jpg",
      uploadState: null,
      uploadId: null,
    });

    render(<ImageNodeView {...props} imageOptimizationPreset="comment" />);

    const image = screen.getByAltText("demo.png");
    expect(image).not.toHaveClass("w-auto");

    await act(async () => {
      image.dispatchEvent(new Event("load"));
    });

    expect(image).toHaveClass("w-auto");
    expect(image).toHaveClass("max-w-full");
    expect(image).toHaveClass("opacity-100");
    expect(image).not.toHaveAttribute("srcset");
  });

  it("comment 预设 CDN 加载成功后忽略误触发的 onError", async () => {
    vi.useFakeTimers();
    const props = makeProps({
      src: "https://blog-oss.yevpt.com/blog/a.jpg?sign=1",
      uploadState: null,
      uploadId: null,
      aspectRatio: null,
    });

    render(<ImageNodeView {...props} imageOptimizationPreset="comment" />);

    const image = screen.getByAltText("demo.png") as HTMLImageElement;
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 640 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 480 });

    await act(async () => {
      image.dispatchEvent(new Event("load"));
    });

    await act(async () => {
      image.dispatchEvent(new Event("error"));
      vi.advanceTimersByTime(6000);
    });

    expect(image.getAttribute("src")).toContain("w=640");
    expect(image.getAttribute("src")).not.toBe("https://blog-oss.yevpt.com/blog/a.jpg?sign=1");
    vi.useRealTimers();
  });

  it("comment 预设解码完成后使用 w-auto max-w-full，避免 w-full 撑满编辑器", async () => {
    vi.useFakeTimers();
    const updateAttributes = vi.fn();
    const props = makeProps({
      src: "https://cdn.example.com/photo.jpg",
      uploadState: "decoding",
      uploadId: null,
    });
    props.updateAttributes = updateAttributes;

    render(<ImageNodeView {...props} imageOptimizationPreset="comment" />);

    const image = screen.getByAltText("demo.png");
    await act(async () => {
      image.dispatchEvent(new Event("load"));
    });

    expect(image).toHaveClass("w-auto");
    expect(image).toHaveClass("max-w-full");
    expect(image).not.toHaveClass("w-full");
  });
});
