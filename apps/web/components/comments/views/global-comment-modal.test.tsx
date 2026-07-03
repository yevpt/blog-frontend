import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useCommentModal } from "@/store/use-comment-modal";
import { GlobalCommentModal } from "./global-comment-modal";

vi.mock("./comment-modal", () => ({
  CommentModal: ({
    targetId,
    targetType,
    onClose,
  }: {
    targetId: number;
    targetType: string;
    onClose: () => void;
  }) => (
    <div
      data-testid="comment-modal"
      data-target-id={String(targetId)}
      data-target-type={targetType}
    >
      <button onClick={onClose}>关闭</button>
    </div>
  ),
}));

describe("GlobalCommentModal", () => {
  beforeEach(() => {
    useCommentModal.setState({
      targetType: null,
      targetId: null,
      onCommentAdded: null,
      isVisible: false,
    });
  });

  it("store 无打开目标时不渲染任何内容", () => {
    const { container } = render(<GlobalCommentModal />);
    expect(container.innerHTML).toBe("");
  });

  it("store 有打开目标时渲染 CommentModal 并传入正确 props", () => {
    useCommentModal.getState().open("article", 42);
    render(<GlobalCommentModal />);

    const modal = screen.getByTestId("comment-modal");
    expect(modal.dataset.targetId).toBe("42");
    expect(modal.dataset.targetType).toBe("article");
  });

  it("CommentModal 的 onClose 调用 store.close()", () => {
    useCommentModal.getState().open("moment", 9);
    render(<GlobalCommentModal />);

    fireEvent.click(screen.getByText("关闭"));

    expect(useCommentModal.getState().targetType).toBeNull();
    expect(useCommentModal.getState().targetId).toBeNull();
  });

  it("有 target 但 isVisible 为 false 时不渲染", () => {
    useCommentModal.setState({
      targetType: "article",
      targetId: 42,
      onCommentAdded: null,
      isVisible: false,
    });
    const { container } = render(<GlobalCommentModal />);
    expect(container.innerHTML).toBe("");
  });
});
