import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { CommentModal } from "./comment-modal";

vi.mock("@repo/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  Button: ({
    children,
    onPress,
    isDisabled,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
}));

const defaultProps = {
  open: true,
  title: "测试文章标题",
  type: "文章",
  onClose: vi.fn(),
};

describe("CommentModal", () => {
  it("open=false 时不渲染", () => {
    const { container } = render(<CommentModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("open=true 时渲染弹窗", () => {
    render(<CommentModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("显示文章标题", () => {
    render(<CommentModal {...defaultProps} />);
    expect(screen.getByText("测试文章标题")).toBeTruthy();
  });

  it("显示文章类型", () => {
    render(<CommentModal {...defaultProps} />);
    expect(screen.getByText("文章")).toBeTruthy();
  });

  it("点击关闭按钮调用 onClose", () => {
    const onClose = vi.fn();
    render(<CommentModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "关闭评论" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("点击遮罩层调用 onClose", () => {
    const onClose = vi.fn();
    render(<CommentModal {...defaultProps} onClose={onClose} />);
    // 遮罩层是 aria-hidden div
    const backdrop = document.querySelector("[aria-hidden='true']") as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("显示模拟评论列表", () => {
    render(<CommentModal {...defaultProps} />);
    expect(screen.getByText("林晓雨")).toBeTruthy();
  });
});
