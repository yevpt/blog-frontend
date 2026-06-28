import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ArticleCoverPreview } from "./ArticleCoverPreview";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("ArticleCoverPreview", () => {
  it("上传完成后在新图解码前仍展示加载遮罩", () => {
    const { rerender } = render(
      <ArticleCoverPreview
        coverUrl="https://example.com/old.jpg"
        isCoverUploading
        onPickCover={vi.fn()}
        onRemoveCover={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("封面上传中")).toBeInTheDocument();

    rerender(
      <ArticleCoverPreview
        coverUrl="https://example.com/new.jpg"
        isCoverUploading={false}
        onPickCover={vi.fn()}
        onRemoveCover={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("封面上传中")).not.toBeInTheDocument();
    expect(screen.getByLabelText("封面加载中")).toBeInTheDocument();
    expect(screen.getByAltText("文章封面预览")).toHaveClass("opacity-0");
  });

  it("新图 onLoad 后隐藏加载遮罩并展示操作按钮", () => {
    render(
      <ArticleCoverPreview
        coverUrl="https://example.com/cover.jpg"
        isCoverUploading={false}
        onPickCover={vi.fn()}
        onRemoveCover={vi.fn()}
      />,
    );

    fireEvent.load(screen.getByAltText("文章封面预览"));

    expect(screen.queryByLabelText("封面加载中")).not.toBeInTheDocument();
    expect(screen.getByAltText("文章封面预览")).toHaveClass("opacity-100");
    expect(screen.getByRole("button", { name: "更换" })).toBeInTheDocument();
  });

  it("aspectRatio=9/16 时使用竖版预览比例", () => {
    const { container } = render(
      <ArticleCoverPreview
        coverUrl=""
        isCoverUploading={false}
        aspectRatio="9/16"
        onPickCover={vi.fn()}
        onRemoveCover={vi.fn()}
      />,
    );

    expect(container.firstChild).toHaveClass("aspect-[9/16]");
    expect(container.firstChild).not.toHaveClass("aspect-video");
  });
});
