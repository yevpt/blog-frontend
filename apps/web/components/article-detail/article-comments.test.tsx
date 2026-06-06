import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleComments } from "./article-comments";

vi.mock("@/components/comments", () => ({
  CommentSection: ({ targetId, targetType, layout }: { targetId: number; targetType: string; layout?: string }) => (
    <div
      data-testid="comment-section"
      data-target-id={String(targetId)}
      data-target-type={targetType} data-layout={layout}
    />
  ),
}));

describe("ArticleComments", () => {
  it("渲染评论标题和计数", () => {
    render(<ArticleComments articleId={42} commentCount={7} />);
    expect(screen.getByText(/评论/)).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it("评论区根节点带稳定锚点 id", () => {
    const { container } = render(<ArticleComments articleId={42} commentCount={7} />);
    expect(container.querySelector("#article-comments")).toBeInTheDocument();
  });

  it("向 CommentSection 传入正确的 targetId 和 targetType", () => {
    render(<ArticleComments articleId={42} commentCount={7} />);
    const section = screen.getByTestId("comment-section");
    expect(section.dataset.layout).toBe("inline");
    expect(section).toHaveAttribute("data-target-id", "42");
    expect(section).toHaveAttribute("data-target-type", "article");
  });
});
