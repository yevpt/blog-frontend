import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const hook = {
  items: [] as unknown[],
  unreadOnly: false,
  setUnreadOnly: vi.fn(),
  loading: false,
  error: false,
  hasMore: false,
  loadMore: vi.fn(),
  reload: vi.fn(),
  markRead: vi.fn(),
  remove: vi.fn(),
  markReadBatch: vi.fn(),
  markAllRead: vi.fn(),
};
vi.mock("./use-notifications", () => ({ useNotifications: () => hook }));
vi.mock("@/store/use-notification-store", () => ({
  useNotificationStore: (sel: (s: { unreadCount: number }) => unknown) => sel({ unreadCount: 0 }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@repo/ui", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onPress, isDisabled, ...p }: any) => (
    <button onClick={onPress} disabled={isDisabled} {...p}>
      {children}
    </button>
  ),
}));
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
vi.mock("./notification-card", () => ({ default: () => <div data-testid="card" /> }));
vi.mock("./notification-filter-tabs", () => ({ default: () => <div data-testid="tabs" /> }));
vi.mock("./notification-selection-bar", () => ({ default: () => <div data-testid="bar" /> }));

import NotificationsPage from "./notifications-page";

describe("NotificationsPage", () => {
  it("无数据显示空状态", () => {
    hook.error = false;
    hook.items = [];
    render(<NotificationsPage />);
    expect(screen.getByText(/还没有消息|没有未读/)).toBeTruthy();
  });

  it("错误态显示重试并触发 reload", () => {
    hook.error = true;
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("重试"));
    expect(hook.reload).toHaveBeenCalled();
    hook.error = false;
  });
});
