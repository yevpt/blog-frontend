import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent", () => {
  it("渲染 html prop 的内容", () => {
    render(<MarkdownContent html="<p>hello world</p>" />);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("article variant（默认）包含 prose 和 prose-neutral 类", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="article" />);
    expect(container.firstChild).toHaveClass("prose", "prose-neutral");
  });

  it("comment variant 包含 prose 和 prose-sm 类", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="comment" />);
    expect(container.firstChild).toHaveClass("prose", "prose-sm");
  });

  it("comment variant 不包含 inline 类（修复旧 MarkdownText 的布局崩溃问题）", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" variant="comment" />);
    expect(container.firstChild).not.toHaveClass("inline");
  });

  it("未传 variant 时默认使用 article 样式", () => {
    const { container } = render(<MarkdownContent html="<p>test</p>" />);
    expect(container.firstChild).toHaveClass("prose-neutral");
  });

  it("className prop 追加到根元素", () => {
    const { container } = render(
      <MarkdownContent html="<p>test</p>" className="my-custom-class" />,
    );
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("html 为空字符串时不崩溃", () => {
    expect(() => render(<MarkdownContent html="" />)).not.toThrow();
  });
});
