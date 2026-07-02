import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ModerationContentType } from "@repo/api";
import { ModerationContentPreview } from "./ModerationContentPreview";

vi.mock("@repo/markdown", () => ({
  markdownToHtmlSync: (content: string) => `<p>${content}</p>`,
  MarkdownContent: ({ html, className }: { html: string; className?: string }) => (
    <div
      data-testid="markdown-body"
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ),
}));

vi.mock("@repo/hooks/cdn-image", () => ({
  optimizeMarkdownImages: (html: string) => html,
}));

describe("ModerationContentPreview", () => {
  it("留言类内容走 Markdown 渲染", () => {
    render(
      <ModerationContentPreview contentType="guestbook" content="你好 **世界**" images={[]} />,
    );

    expect(screen.getByTestId("markdown-body")).toHaveTextContent("你好 **世界**");
  });

  it("碎语在无正文时展示图片网格", () => {
    render(
      <ModerationContentPreview
        contentType="moment"
        content=""
        images={[
          {
            seq: 0,
            object_key: "moments/1/a.jpg",
            access_url: "https://cdn.example.com/a.jpg",
            display_mode: "pending",
            media_type: "image/jpeg",
            is_gif: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("图片")).toBeInTheDocument();
    expect(screen.getByRole("img", { hidden: true })).toHaveAttribute(
      "src",
      "https://cdn.example.com/a.jpg",
    );
  });

  it("空内容显示占位文案", () => {
    render(
      <ModerationContentPreview
        contentType={"article_comment" as ModerationContentType}
        content=""
        emptyLabel="（尚未发布）"
      />,
    );

    expect(screen.getByText("（尚未发布）")).toBeInTheDocument();
  });
});
