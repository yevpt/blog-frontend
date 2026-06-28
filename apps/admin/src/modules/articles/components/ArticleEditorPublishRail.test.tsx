import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleEditorPublishRail } from "./ArticleEditorPublishRail";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("./ArticleTagPicker", () => ({
  ArticleTagPicker: () => <div role="group" aria-label="文章标签" />,
}));

const baseProps = {
  coverUrl: "",
  isCoverUploading: false,
  coverInputRef: { current: null },
  categories: [{ id: 1, name: "前端" }],
  categoryId: 1,
  selectedTags: [],
  tagCandidates: [],
  selectedMusic: null,
  musicPickerOpen: false,
  commentStatus: 1 as const,
  isRecommended: false,
  musicPickerTrigger: null,
  onCoverFileChange: vi.fn(),
  onRemoveCover: vi.fn(),
  onCategoryChange: vi.fn(),
  onTagsChange: vi.fn(),
  onMusicPickerOpenChange: vi.fn(),
  onRemoveMusic: vi.fn(),
  onCommentStatusChange: vi.fn(),
  onIsRecommendedChange: vi.fn(),
  articleStatus: 3 as const,
  onArticleStatusChange: vi.fn(),
};

describe("ArticleEditorPublishRail", () => {
  it("渲染封面、分类、推荐与评论设置", () => {
    render(<ArticleEditorPublishRail {...baseProps} />);

    expect(screen.getByLabelText("文章分类")).toBeInTheDocument();
    expect(screen.getByLabelText("推荐到首页")).toBeInTheDocument();
    expect(screen.getByLabelText("评论设置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加背景音乐" })).toBeInTheDocument();
  });

  it("切换推荐开关时触发 onIsRecommendedChange", async () => {
    const user = userEvent.setup();
    const onIsRecommendedChange = vi.fn();

    render(
      <ArticleEditorPublishRail {...baseProps} onIsRecommendedChange={onIsRecommendedChange} />,
    );

    await user.click(screen.getByLabelText("推荐到首页"));

    expect(onIsRecommendedChange).toHaveBeenCalledWith(true);
  });

  it("有封面时渲染紧凑的更换与移除操作", () => {
    render(
      <ArticleEditorPublishRail
        {...baseProps}
        coverUrl="https://example.com/cover.jpg"
        categories={[]}
        categoryId={null}
      />,
    );

    fireEvent.load(screen.getByAltText("文章封面预览"));

    expect(screen.getByRole("button", { name: "更换" })).toHaveClass("h-[26px]");
    expect(screen.getByRole("button", { name: "移除" })).toHaveClass("h-[26px]");
  });

  it("封面上传时在预览区展示加载遮罩", () => {
    const { rerender } = render(
      <ArticleEditorPublishRail
        {...baseProps}
        categories={[]}
        categoryId={null}
        isCoverUploading={false}
      />,
    );

    expect(screen.queryByLabelText("封面上传中")).not.toBeInTheDocument();

    rerender(
      <ArticleEditorPublishRail
        {...baseProps}
        categories={[]}
        categoryId={null}
        isCoverUploading
      />,
    );

    expect(screen.getByLabelText("封面上传中")).toBeInTheDocument();
    expect(screen.getByLabelText("封面上传中").querySelector(".animate-spin")).toBeTruthy();

    rerender(
      <ArticleEditorPublishRail
        {...baseProps}
        categories={[]}
        categoryId={null}
        coverUrl="https://example.com/cover.jpg"
        isCoverUploading
      />,
    );

    expect(screen.getByLabelText("封面上传中")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "更换" })).not.toBeInTheDocument();
  });

  it("上传完成后在新图解码前仍展示加载遮罩", () => {
    const { rerender } = render(
      <ArticleEditorPublishRail
        {...baseProps}
        categories={[]}
        categoryId={null}
        coverUrl="https://example.com/old.jpg"
        isCoverUploading
      />,
    );

    rerender(
      <ArticleEditorPublishRail
        {...baseProps}
        categories={[]}
        categoryId={null}
        coverUrl="https://example.com/new.jpg"
        isCoverUploading={false}
      />,
    );

    expect(screen.getByLabelText("封面加载中")).toBeInTheDocument();
  });
});
