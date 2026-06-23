import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { NotificationItemResp } from "@repo/api";

const hook = {
  items: [] as NotificationItemResp[],
  enteringIds: new Set<number>(),
  staggerAnimateIds: new Set<number>(),
  unreadOnly: false,
  setUnreadOnly: vi.fn(),
  loading: false,
  error: false,
  hasMore: false,
  loadMore: vi.fn(),
  reload: vi.fn(),
  markRead: vi.fn(),
  markReadBatch: vi.fn(),
  markAllRead: vi.fn(),
  updateItemEngagement: vi.fn(),
};
const storeState = vi.hoisted(() => ({ unreadCount: 0 }));
const routerPush = vi.hoisted(() => vi.fn());
const apiJson = vi.hoisted(() => vi.fn());

function listItem(over: Partial<NotificationItemResp> = {}): NotificationItemResp {
  return {
    id: 1,
    event_id: 1,
    type: "comment_created",
    title: "t",
    content_excerpt: "正文",
    is_read: false,
    created_at: "",
    source_type: "comment",
    source_id: 42,
    root_type: "article",
    root_id: 5,
    source_deleted: false,
    root_deleted: false,
    ...over,
  };
}

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
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock("@/lib/client-fetch", () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }));
vi.mock("@/lib/toast", () => ({ addToast: vi.fn() }));
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
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
vi.mock("./notification-filter-tabs", () => ({ default: () => <div data-testid="tabs" /> }));
vi.mock("./notification-selection-bar", () => ({ default: () => <div data-testid="bar" /> }));
vi.mock("./notification-virtual-list", () => ({
  NotificationVirtualList: (props: {
    items: NotificationItemResp[];
    onInlineLike?: (item: NotificationItemResp) => void | Promise<void>;
    onInlineReplySubmit?: (item: NotificationItemResp, content: string) => Promise<boolean>;
  }) => (
    <div data-testid="virtual-list">
      {props.items.map((item) => (
        <div key={item.id} data-testid="card">
          <button type="button" onClick={() => void props.onInlineLike?.(item)}>
            内联点赞
          </button>
          <button type="button" onClick={() => void props.onInlineReplySubmit?.(item, "测试回复")}>
            内联回复
          </button>
        </div>
      ))}
    </div>
  ),
}));

import NotificationsPage from "./notifications-page";

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hook.items = [];
    hook.loading = false;
    hook.error = false;
  });

  it("首屏加载中显示骨架屏", () => {
    hook.loading = true;
    render(<NotificationsPage />);
    expect(screen.queryByText(/还没有消息|没有未读/)).toBeNull();
    expect(screen.getByTestId("notification-skeleton-region")).toBeTruthy();
    expect(screen.getAllByTestId("notification-skeleton-card")).toHaveLength(8);
  });

  it("加载完成后无数据显示空状态", () => {
    storeState.unreadCount = 0;
    render(<NotificationsPage />);
    expect(screen.getByText(/还没有消息|没有未读/)).toBeTruthy();
  });

  it("标题右侧不再显示未读数量", () => {
    storeState.unreadCount = 8;
    render(<NotificationsPage />);
    expect(screen.getByRole("heading", { name: "消息中心" })).toBeTruthy();
    expect(screen.queryByText("8 条未读")).toBeNull();
  });

  it("不显示选择按钮，全部已读在 tabs 行右侧", () => {
    storeState.unreadCount = 2;
    render(<NotificationsPage />);
    expect(screen.queryByText("选择")).toBeNull();
    fireEvent.click(screen.getByText("全部已读"));
    expect(hook.markAllRead).toHaveBeenCalled();
  });

  it("错误态显示重试并触发 reload", () => {
    storeState.unreadCount = 0;
    hook.error = true;
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("重试"));
    expect(hook.reload).toHaveBeenCalled();
  });

  it("内联点赞调用评论点赞 API 并更新列表状态", async () => {
    hook.items = [listItem()];
    apiJson.mockResolvedValue({ is_liked: true, like_count: 4 });
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("内联点赞"));
    await vi.waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith("/api/articles/comments/42/like", { method: "POST" }),
    );
    expect(hook.markRead).toHaveBeenCalledWith(1);
    expect(hook.updateItemEngagement).toHaveBeenCalledWith(1, {
      is_liked: true,
      like_count: 4,
    });
  });

  it("内联点赞已读消息不再调用 markRead", async () => {
    hook.items = [listItem({ is_read: true })];
    apiJson.mockResolvedValue({ is_liked: true, like_count: 4 });
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("内联点赞"));
    await vi.waitFor(() => expect(apiJson).toHaveBeenCalled());
    expect(hook.markRead).not.toHaveBeenCalled();
  });

  it("内联回复调用对应评论回复 API 并更新回复数", async () => {
    hook.items = [listItem()];
    apiJson.mockResolvedValue({ id: 99 });
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("内联回复"));
    await vi.waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith("/api/articles/comments/42/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_reply_id: 0, content: "测试回复" }),
      }),
    );
    expect(hook.markRead).toHaveBeenCalledWith(1);
    expect(hook.updateItemEngagement).toHaveBeenCalledWith(1, { reply_count: 1 });
  });

  it("内联回复已读消息不再调用 markRead", async () => {
    hook.items = [listItem({ is_read: true })];
    apiJson.mockResolvedValue({ id: 99 });
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("内联回复"));
    await vi.waitFor(() => expect(apiJson).toHaveBeenCalled());
    expect(hook.markRead).not.toHaveBeenCalled();
    expect(hook.updateItemEngagement).toHaveBeenCalledWith(1, { reply_count: 1 });
  });
});
