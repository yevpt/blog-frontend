import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationSelectionBar from "./notification-selection-bar";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
vi.mock("@repo/ui", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onPress, isDisabled, ...p }: any) => (
    <button onClick={onPress} disabled={isDisabled} {...p}>
      {children}
    </button>
  ),
}));

describe("NotificationSelectionBar", () => {
  it("显示已选数量并触发标记已读", () => {
    const onMarkRead = vi.fn();
    render(<NotificationSelectionBar count={2} onMarkRead={onMarkRead} onCancel={vi.fn()} />);
    expect(screen.getByText(/已选 2 条/)).toBeTruthy();
    fireEvent.click(screen.getByText("标记已读"));
    expect(onMarkRead).toHaveBeenCalled();
  });

  it("count 为 0 时标记已读禁用", () => {
    render(<NotificationSelectionBar count={0} onMarkRead={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("标记已读").closest("button")?.disabled).toBe(true);
  });
});
