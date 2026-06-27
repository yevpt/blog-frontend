import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownStatic } from "./markdown-static";
import { wrapMarkdownImagesWithSkeletonHtml } from "./image-skeleton";

describe("MarkdownStatic", () => {
  it("服务端直接输出含骨架的 HTML", () => {
    const html = wrapMarkdownImagesWithSkeletonHtml(
      '<img src="https://example.com/a.jpg" alt="图">',
      "article",
    );
    const { container } = render(
      <MarkdownStatic html={html} variant="article" contentId="test-md" previewable />,
    );

    const root = container.querySelector("#test-md");
    expect(root).toBeInTheDocument();
    expect(root?.innerHTML).toContain("md-image-wrapper");
    expect(root?.innerHTML).toContain("md-image-skeleton");
    expect(root).toHaveClass("prose");
  });
});
