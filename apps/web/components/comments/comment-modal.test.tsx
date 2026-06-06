// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
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

vi.mock("./comment-section", () => ({
  CommentSection: ({ targetType, targetId }: { targetType: string; targetId: number }) => (
    <div data-testid="comment-section" data-target-type={targetType} data-target-id={targetId} />
  ),
}));

vi.mock("@/hooks/use-sheet-gesture", () => ({
  useSheetGesture: () => ({
    sheetStyle: {},
    isDragging: false,
  }),
}));

// CommentModal 不接受 open prop，由父组件条件挂载控制显隐
describe("CommentModal", () => {
  it("挂载后渲染 dialog 和「评论」标题", () => {
    render(<CommentModal targetType="article" targetId={1} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("评论")).toBeTruthy();
  });

  it("header 只显示「评论」文字", () => {
    render(<CommentModal targetType="article" targetId={1} onClose={vi.fn()} />);
    // header 元素中只有「评论」文字（不显示文章标题等多余信息）
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.textContent).toBe("评论");
  });

  it("点击遮罩触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <CommentModal targetType="article" targetId={1} onClose={onClose} />,
    );
    const backdrop = container.firstElementChild as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("点击关闭按钮触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommentModal targetType="article" targetId={1} onClose={onClose} />);
    await user.click(screen.getByLabelText("关闭评论"));
    expect(onClose).toHaveBeenCalled();
  });

  it("渲染 CommentSection 并传入正确 targetType/targetId", () => {
    render(<CommentModal targetType="moment" targetId={7} onClose={vi.fn()} />);
    const section = screen.getByTestId("comment-section");
    expect(section.dataset.targetType).toBe("moment");
    expect(section.dataset.targetId).toBe("7");
  });
});
