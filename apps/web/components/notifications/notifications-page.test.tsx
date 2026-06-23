import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

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
const storeState = vi.hoisted(() => ({ unreadCount: 0 }));

type MockButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  children?: ReactNode;
  isDisabled?: boolean;
  onPress?: () => void;
  size?: unknown;
  variant?: unknown;
};

vi.mock("./use-notifications", () => ({ useNotifications: () => hook }));
vi.mock("@/store/use-notification-store", () => ({
  useNotificationStore: (sel: (s: { unreadCount: number }) => unknown) => sel(storeState),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    size: _size,
    variant: _variant,
    ...p
  }: MockButtonProps) => (
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
    storeState.unreadCount = 0;
    hook.error = false;
    hook.items = [];
    render(<NotificationsPage />);
    expect(screen.getByText(/还没有消息|没有未读/)).toBeTruthy();
  });

  it("标题右侧不再显示未读数量", () => {
    storeState.unreadCount = 8;
    hook.error = false;
    hook.items = [];
    render(<NotificationsPage />);
    expect(screen.getByRole("heading", { name: "消息中心" })).toBeTruthy();
    expect(screen.queryByText("8 条未读")).toBeNull();
  });

  it("错误态显示重试并触发 reload", () => {
    storeState.unreadCount = 0;
    hook.error = true;
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("重试"));
    expect(hook.reload).toHaveBeenCalled();
    hook.error = false;
  });
});
