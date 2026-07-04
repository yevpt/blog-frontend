// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichEditor } from "../RichEditor";

const TWO_IMAGES = "![一](https://e.com/1.png)\n\n![二](https://e.com/2.png)";

describe("ImageGalleryNodeView", () => {
  it("启用 enableImageGallery 时相邻图片渲染为轮播滑道与 chrome", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} enableImageGallery />);
    await waitFor(() => {
      expect(screen.getByLabelText("下一张")).toBeTruthy();
    });
    expect(screen.getByLabelText("上一张")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getAllByLabelText(/跳转到第 \d 张/)).toHaveLength(2);
    expect(screen.queryByLabelText("添加图片")).toBeNull();
  });

  it("未启用 enableImageGallery 时不出现轮播 chrome", async () => {
    render(<RichEditor value={TWO_IMAGES} onChange={vi.fn()} />);
    await waitFor(() => {
      expect(document.querySelector(".ProseMirror")).toBeTruthy();
    });
    expect(screen.queryByLabelText("下一张")).toBeNull();
  });

  it("注入 onInsertImage 后显示添加图片按钮", async () => {
    render(
      <RichEditor
        value={TWO_IMAGES}
        onChange={vi.fn()}
        enableImageGallery
        onInsertImage={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("添加图片")).toBeTruthy();
    });
  });
});
