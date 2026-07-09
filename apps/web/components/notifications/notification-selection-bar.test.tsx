import type { ComponentProps } from "react";
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
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

function renderBar(over: Partial<ComponentProps<typeof NotificationSelectionBar>> = {}) {
  return render(
    <NotificationSelectionBar
      count={0}
      allSelected={false}
      onToggleSelectAll={vi.fn()}
      onInvertSelect={vi.fn()}
      onMarkRead={vi.fn()}
      onCancel={vi.fn()}
      {...over}
    />,
  );
}

describe("NotificationSelectionBar", () => {
  it("显示已选数量并触发标记已读", () => {
    const onMarkRead = vi.fn();
    renderBar({ count: 2, onMarkRead });
    expect(screen.getByText(/已选 2 条/)).toBeTruthy();
    fireEvent.click(screen.getByText("标记已读"));
    expect(onMarkRead).toHaveBeenCalled();
  });

  it("count 为 0 时标记已读禁用", () => {
    renderBar({ count: 0 });
    expect(screen.getByText("标记已读").closest("button")?.disabled).toBe(true);
  });

  it("点击取消触发 onCancel", () => {
    const onCancel = vi.fn();
    renderBar({ onCancel });
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("未选中任何一条时全选 checkbox 为未选中且非半选", () => {
    renderBar({ count: 0, allSelected: false });
    const checkbox = screen.getByRole("checkbox", { name: "全选" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.indeterminate).toBe(false);
  });

  it("部分选中时全选 checkbox 呈半选态", () => {
    renderBar({ count: 1, allSelected: false });
    const checkbox = screen.getByRole("checkbox", { name: "全选" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.indeterminate).toBe(true);
  });

  it("全部选中时全选 checkbox 呈勾选态", () => {
    renderBar({ count: 3, allSelected: true });
    const checkbox = screen.getByRole("checkbox", { name: "全选" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.indeterminate).toBe(false);
  });

  it("点击全选 checkbox 触发 onToggleSelectAll", () => {
    const onToggleSelectAll = vi.fn();
    renderBar({ onToggleSelectAll });
    fireEvent.click(screen.getByRole("checkbox", { name: "全选" }));
    expect(onToggleSelectAll).toHaveBeenCalled();
  });

  it("点击反选按钮触发 onInvertSelect", () => {
    const onInvertSelect = vi.fn();
    renderBar({ count: 1, onInvertSelect });
    fireEvent.click(screen.getByText("反选"));
    expect(onInvertSelect).toHaveBeenCalled();
  });
});
