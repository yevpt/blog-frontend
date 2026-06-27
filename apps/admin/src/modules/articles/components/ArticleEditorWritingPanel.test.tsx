import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleEditorWritingPanel } from "./ArticleEditorWritingPanel";

const richEditorProps = vi.fn();
vi.mock("@repo/editor", () => ({
  RichEditor: (props: Record<string, unknown>) => {
    richEditorProps(props);
    return (
      <textarea aria-label="文章内容编辑器" placeholder={props.placeholder as string | undefined} />
    );
  },
  LinkDialog: () => null,
}));

describe("ArticleEditorWritingPanel", () => {
  beforeEach(() => {
    richEditorProps.mockClear();
  });

  it("向 RichEditor 传入图片与链接插入 handler", () => {
    render(
      <ArticleEditorWritingPanel
        title=""
        description=""
        content=""
        contentLength={0}
        readMinutes={1}
        autosaveStatusText="本机备份待命"
        isContentImageUploading={false}
        contentImageInputRef={{ current: null }}
        onTitleChange={vi.fn()}
        onDescriptionChange={vi.fn()}
        onContentChange={vi.fn()}
        onInsertImage={vi.fn()}
        onContentImageFileChange={vi.fn()}
      />,
    );

    const props = richEditorProps.mock.calls[0][0];
    expect(typeof props.onInsertImage).toBe("function");
    expect(typeof props.onInsertLink).toBe("function");
    expect(props.enableBlockquote).toBe(true);
  });

  it("渲染标题、摘要与字数统计", () => {
    render(
      <ArticleEditorWritingPanel
        title="标题"
        description="摘要"
        content=""
        contentLength={120}
        readMinutes={1}
        autosaveStatusText="已本机备份 16:00"
        isContentImageUploading={false}
        contentImageInputRef={{ current: null }}
        onTitleChange={vi.fn()}
        onDescriptionChange={vi.fn()}
        onContentChange={vi.fn()}
        onInsertImage={vi.fn()}
        onContentImageFileChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "文章标题" })).toHaveValue("标题");
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText(/分钟/)).toBeInTheDocument();
    expect(screen.getByText("已本机备份 16:00")).toBeInTheDocument();
  });

  it("写作区限制在容器内滚动，避免撑开整页", () => {
    const { container } = render(
      <ArticleEditorWritingPanel
        title=""
        description=""
        content=""
        contentLength={0}
        readMinutes={1}
        autosaveStatusText="本机备份中..."
        isContentImageUploading={false}
        contentImageInputRef={{ current: null }}
        onTitleChange={vi.fn()}
        onDescriptionChange={vi.fn()}
        onContentChange={vi.fn()}
        onInsertImage={vi.fn()}
        onContentImageFileChange={vi.fn()}
      />,
    );

    const panel = screen.getByLabelText("写作区");
    expect(panel).toHaveClass("xl:overflow-hidden");
    expect(panel).toHaveClass("xl:h-full");
    expect(panel).toHaveClass("max-xl:overflow-visible");
    expect(container.querySelector(".border-t")).toHaveClass("xl:min-h-0");
  });
});
