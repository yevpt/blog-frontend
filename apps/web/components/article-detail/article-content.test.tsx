import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleContent } from "./article-content";

describe("ArticleContent", () => {
  it("渲染 HTML 内容", () => {
    render(<ArticleContent contentHtml="<p>Hello <strong>World</strong></p>" />);
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("包含阅读进度条", () => {
    const { container } = render(<ArticleContent contentHtml="<p>test</p>" />);
    expect(container.querySelector("[data-testid='reading-progress']")).toBeInTheDocument();
  });
});
