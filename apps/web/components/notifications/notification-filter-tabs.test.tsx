import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationFilterTabs from "./notification-filter-tabs";

vi.mock("@repo/ui", () => ({ cn: (...a: unknown[]) => a.filter(Boolean).join(" ") }));

describe("NotificationFilterTabs", () => {
  it("点击未读触发 onChange(true)", () => {
    const onChange = vi.fn();
    render(<NotificationFilterTabs unreadOnly={false} unreadCount={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /未读/ }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("未读计数 > 0 时显示徽标", () => {
    render(<NotificationFilterTabs unreadOnly={false} unreadCount={3} onChange={vi.fn()} />);
    expect(screen.getByText("3")).toBeTruthy();
  });
});
