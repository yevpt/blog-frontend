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
});
