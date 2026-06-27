import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleContent } from "./article-content";
import { ARTICLE_MARKDOWN_CONTENT_ID } from "./article-markdown-effects";

vi.mock("./article-markdown-effects", () => ({
  ARTICLE_MARKDOWN_CONTENT_ID: "article-markdown-body",
  ArticleMarkdownEffects: () => <div data-testid="article-markdown-effects" />,
}));

vi.mock("@repo/markdown", () => ({
  MarkdownStatic: ({
    html,
    contentId,
  }: {
    html: string;
    contentId?: string;
    variant?: string;
    previewable?: boolean;
  }) => (
    <div id={contentId} data-testid="markdown-static" dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

describe("ArticleContent", () => {
  it("渲染 HTML 内容并挂载客户端增强", () => {
    render(<ArticleContent contentHtml="<p>Hello <strong>World</strong></p>" />);
    expect(screen.getByText("World")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-static")).toHaveAttribute(
      "id",
      ARTICLE_MARKDOWN_CONTENT_ID,
    );
    expect(screen.getByTestId("article-markdown-effects")).toBeInTheDocument();
  });

  it("服务端 HTML 可含图片骨架包裹", () => {
    const html =
      '<span class="md-image-wrapper md-image-wrapper--article"><span class="md-image-skeleton loading-image-skeleton"></span><img alt="图" class="md-image-pending"></span>';
    render(<ArticleContent contentHtml={html} />);
    expect(screen.getByTestId("markdown-static").innerHTML).toContain("md-image-skeleton");
  });
});
