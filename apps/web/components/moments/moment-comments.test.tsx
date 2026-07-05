import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MomentComments } from "./moment-comments";

vi.mock("@/components/comments", () => ({
  InlineComments: ({
    targetId,
    targetType,
    expectedCommentCount,
    onCommentAdded,
  }: {
    targetId: number;
    targetType: string;
    expectedCommentCount?: number;
    onCommentAdded?: () => void;
  }) => (
    <div
      data-testid="inline-comments"
      data-target-id={String(targetId)}
      data-target-type={targetType}
      data-expected-comment-count={String(expectedCommentCount ?? "")}
    >
      <button data-testid="trigger-comment-added" onClick={onCommentAdded}>
        模拟添加评论
      </button>
    </div>
  ),
}));

describe("MomentComments", () => {
  it("渲染评论标题和计数", () => {
    render(<MomentComments momentId={42} commentCount={7} />);
    expect(screen.getByRole("heading", { name: /评论/ })).toBeInTheDocument();
    expect(screen.getByText("7 条")).toBeInTheDocument();
  });

  it("评论区根节点带稳定锚点 id", () => {
    const { container } = render(<MomentComments momentId={42} commentCount={7} />);
    expect(container.querySelector("#moment-detail-comments")).toBeInTheDocument();
  });

  it("向 InlineComments 传入正确的 targetId 和 targetType", () => {
    render(<MomentComments momentId={42} commentCount={7} />);
    const section = screen.getByTestId("inline-comments");
    expect(section).toHaveAttribute("data-target-id", "42");
    expect(section).toHaveAttribute("data-target-type", "moment");
    expect(section).toHaveAttribute("data-expected-comment-count", "7");
  });

  it("onCommentAdded 触发后评论计数递增", async () => {
    const user = userEvent.setup();
    render(<MomentComments momentId={42} commentCount={7} />);
    expect(screen.getByText("7 条")).toBeTruthy();
    await user.click(screen.getByTestId("trigger-comment-added"));
    expect(screen.getByText("8 条")).toBeTruthy();
  });
});
