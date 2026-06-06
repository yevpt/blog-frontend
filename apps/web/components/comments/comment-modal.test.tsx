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

describe("CommentModal", () => {
  it("open=false 时不渲染", () => {
    render(
      <CommentModal open={false} targetType="article" targetId={1} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染遮罩和 dialog", () => {
    render(
      <CommentModal open={true} targetType="article" targetId={1} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("评论")).toBeTruthy();
  });

  it("header 只显示「评论」，不显示文章标题", () => {
    render(
      <CommentModal open={true} targetType="article" targetId={1} onClose={vi.fn()} />,
    );
    const header = screen.getByRole("banner");
    expect(header).toBeTruthy();
    expect(header.textContent?.trim()).toBe("评论");
  });

  it("点击遮罩触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <CommentModal open={true} targetType="article" targetId={1} onClose={onClose} />,
    );
    const backdrop = container.firstElementChild as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("渲染 CommentSection 并传入正确 targetType/targetId", () => {
    render(
      <CommentModal open={true} targetType="moment" targetId={7} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId("comment-section")).toBeTruthy();
    expect(screen.getByTestId("comment-section").dataset.targetType).toBe("moment");
    expect(screen.getByTestId("comment-section").dataset.targetId).toBe("7");
  });
});
