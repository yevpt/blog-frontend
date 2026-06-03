import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { CommentModal } from "./comment-modal";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

describe("CommentModal", () => {
  it("关闭时不渲染弹窗内容", () => {
    render(<CommentModal open={false} title="测试文章" type="技术" onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("打开时显示文章类型、标题和评论输入框", () => {
    render(<CommentModal open title="测试文章" type="技术" onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "评论" })).toBeTruthy();
    expect(screen.getByText("技术 · 评论")).toBeTruthy();
    expect(screen.getByText("测试文章")).toBeTruthy();
    expect(screen.getByPlaceholderText("写下你的评论...")).toBeTruthy();
  });

  it("点击关闭按钮触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommentModal open title="测试文章" type="技术" onClose={onClose} />);

    await user.click(screen.getByLabelText("关闭评论"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
