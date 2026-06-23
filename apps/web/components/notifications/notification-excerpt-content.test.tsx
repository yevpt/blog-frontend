import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type * as MarkdownNamespace from "@repo/markdown";
import { NotificationExcerptContent } from "./notification-excerpt-content";

vi.mock("@/components/common/previewable-markdown", () => ({
  PreviewableMarkdown: ({ html }: { html: string }) => (
    <div data-testid="markdown-html" dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@repo/markdown", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof MarkdownNamespace;
  return actual;
});

describe("NotificationExcerptContent", () => {
  it("恶意 img 摘录渲染为占位图标，不含 img 标签", () => {
    render(<NotificationExcerptContent content='<img src="123" onerror="alert(1)"/>' />);
    const container = screen.getByTestId("markdown-html");
    expect(container.innerHTML).not.toContain("<img");
    expect(container.innerHTML).toContain("md-image-fallback");
    expect(container.innerHTML).toContain("#icon-image-off");
  });

  it("合法 https 图片正常渲染 img", () => {
    render(
      <NotificationExcerptContent content='<img src="https://example.com/a.png" alt="图"/>' />,
    );
    const container = screen.getByTestId("markdown-html");
    expect(container.innerHTML).toContain("<img");
    expect(container.innerHTML).toContain("https://example.com/a.png");
  });
});
