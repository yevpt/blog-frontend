import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleComments } from "./article-comments";

vi.mock("@/components/comments", () => ({
  CommentSection: ({
    targetId,
    targetType,
    layout,
    onCommentAdded,
  }: {
    targetId: number;
    targetType: string;
    layout?: string;
    onCommentAdded?: () => void;
  }) => (
    <div
      data-testid="comment-section"
      data-target-id={String(targetId)}
      data-target-type={targetType}
      data-layout={layout}
    >
      <button data-testid="trigger-comment-added" onClick={onCommentAdded}>
        模拟添加评论
      </button>
    </div>
  ),
}));

describe("ArticleComments", () => {
  it("渲染评论标题和计数", () => {
    render(<ArticleComments articleId={42} commentCount={7} />);
    expect(screen.getByRole("heading", { name: /评论/ })).toBeInTheDocument();
    expect(screen.getByText("7 条")).toBeInTheDocument();
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

  it("onCommentAdded 触发后评论计数递增", async () => {
    const user = userEvent.setup();
    render(<ArticleComments articleId={42} commentCount={7} />);
    expect(screen.getByText("7 条")).toBeTruthy();
    await user.click(screen.getByTestId("trigger-comment-added"));
    expect(screen.getByText("8 条")).toBeTruthy();
  });
});
