import { useCallback } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageViewer } from "./image-viewer";
import type * as UseViewerTransformModule from "./internal/use-viewer-transform";

const imgs = [
  { src: "https://example.com/a.jpg", alt: "图A" },
  { src: "https://example.com/b.jpg", alt: "图B" },
];

// 关闭时若立即重置缩放/旋转，会与 Modal 的退场动画叠加产生跳变，
// 因此用 spy 直接校验「关闭」这一变化本身不触发 reset。
const resetSpy = vi.hoisted(() => vi.fn());
vi.mock("./internal/use-viewer-transform", async (importOriginal) => {
  const actual = await importOriginal<typeof UseViewerTransformModule>();
  return {
    ...actual,
    useViewerTransform: () => {
      const result = actual.useViewerTransform();
      const actualReset = result.reset;
      // useCallback 保持引用稳定，否则每次渲染都会触发依赖 reset 的 effect 重新执行
      const reset = useCallback(() => {
        resetSpy();
        actualReset();
      }, [actualReset]);
      return { ...result, reset };
    },
  };
});

describe("ImageViewer", () => {
  it("isOpen=false 不渲染对话框", () => {
    render(<ImageViewer images={imgs} index={0} isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("isOpen=true 渲染当前图片", () => {
    render(<ImageViewer images={imgs} index={0} isOpen onClose={() => {}} />);
    const img = screen.getByAltText("图A") as HTMLImageElement;
    expect(img.src).toContain("a.jpg");
  });

  it("点击关闭按钮触发 onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ImageViewer images={imgs} index={0} isOpen onClose={onClose} />);
    await user.click(screen.getByLabelText("关闭预览"));
    expect(onClose).toHaveBeenCalled();
  });

  it("多图时显示上下张按钮并回调 onIndexChange", async () => {
    const onIndexChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ImageViewer
        images={imgs}
        index={0}
        isOpen
        onClose={() => {}}
        onIndexChange={onIndexChange}
      />,
    );
    await user.click(screen.getByLabelText("下一张"));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("单图时不显示切换按钮", () => {
    render(<ImageViewer images={[imgs[0]]} index={0} isOpen onClose={() => {}} />);
    expect(screen.queryByLabelText("下一张")).not.toBeInTheDocument();
  });

  it("点击放大后再缩小不报错且渲染稳定", () => {
    render(<ImageViewer images={imgs} index={0} isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText("放大"));
    fireEvent.click(screen.getByLabelText("缩小"));
    expect(screen.getByAltText("图A")).toBeInTheDocument();
  });

  it("舞台底部预留工具栏安全间距，避免遮挡竖向照片", () => {
    render(<ImageViewer images={imgs} index={0} isOpen onClose={() => {}} />);
    expect(screen.getByTestId("image-viewer-stage")).toHaveClass("pb-24");
  });

  it("关闭时不重置已旋转/缩放的变换，避免和退场动效叠加产生跳变", () => {
    const { rerender } = render(<ImageViewer images={imgs} index={0} isOpen onClose={() => {}} />);
    resetSpy.mockClear();
    fireEvent.click(screen.getByLabelText("旋转"));
    rerender(<ImageViewer images={imgs} index={0} isOpen={false} onClose={() => {}} />);
    expect(resetSpy).not.toHaveBeenCalled();
  });
});
