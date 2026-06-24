import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleEditorPublishRail } from "./ArticleEditorPublishRail";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("./ArticleTagPicker", () => ({
  ArticleTagPicker: () => <div role="group" aria-label="文章标签" />,
}));

describe("ArticleEditorPublishRail", () => {
  it("渲染封面、分类与评论设置", () => {
    render(
      <ArticleEditorPublishRail
        coverUrl=""
        isCoverUploading={false}
        coverInputRef={{ current: null }}
        categories={[{ id: 1, name: "前端" }]}
        categoryId={1}
        selectedTags={[]}
        tagCandidates={[]}
        selectedMusic={null}
        musicPickerOpen={false}
        commentStatus={1}
        musicPickerTrigger={null}
        onCoverFileChange={vi.fn()}
        onRemoveCover={vi.fn()}
        onCategoryChange={vi.fn()}
        onTagsChange={vi.fn()}
        onMusicPickerOpenChange={vi.fn()}
        onRemoveMusic={vi.fn()}
        onCommentStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("文章分类")).toBeInTheDocument();
    expect(screen.getByLabelText("评论设置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加背景音乐" })).toBeInTheDocument();
  });

  it("有封面时渲染紧凑的更换与移除操作", () => {
    render(
      <ArticleEditorPublishRail
        coverUrl="https://example.com/cover.jpg"
        isCoverUploading={false}
        coverInputRef={{ current: null }}
        categories={[]}
        categoryId={null}
        selectedTags={[]}
        tagCandidates={[]}
        selectedMusic={null}
        musicPickerOpen={false}
        commentStatus={1}
        musicPickerTrigger={null}
        onCoverFileChange={vi.fn()}
        onRemoveCover={vi.fn()}
        onCategoryChange={vi.fn()}
        onTagsChange={vi.fn()}
        onMusicPickerOpenChange={vi.fn()}
        onRemoveMusic={vi.fn()}
        onCommentStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "更换" })).toHaveClass("h-[26px]");
    expect(screen.getByRole("button", { name: "移除" })).toHaveClass("h-[26px]");
  });
});
