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
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
vi.mock("./notification-filter-tabs", () => ({ default: () => <div data-testid="tabs" /> }));
vi.mock("./mark-all-read-button", () => ({
  MarkAllReadButton: ({
    unreadCount,
    onConfirm,
  }: {
    unreadCount: number;
    onConfirm: () => void;
  }) => (
    <button type="button" aria-label="全部已读" disabled={unreadCount === 0} onClick={onConfirm}>
      全部已读
    </button>
  ),
}));
vi.mock("./notification-selection-bar", () => ({
  default: ({
    count,
    allSelected,
    onToggleSelectAll,
    onInvertSelect,
    onMarkRead,
    onCancel,
  }: {
    count: number;
    allSelected: boolean;
    onToggleSelectAll: () => void;
    onInvertSelect: () => void;
    onMarkRead: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="bar">
      <span data-testid="bar-count">{count}</span>
      <span data-testid="bar-all-selected">{String(allSelected)}</span>
      <button type="button" onClick={onToggleSelectAll}>
        切换全选
      </button>
      <button type="button" onClick={onInvertSelect}>
        反选
      </button>
      <button type="button" onClick={onMarkRead}>
        标记已读
      </button>
      <button type="button" onClick={onCancel}>
        取消
      </button>
    </div>
  ),
}));
vi.mock("@/components/float-dock", () => ({
  FloatDockPageAnchor: ({ enabled }: { enabled?: boolean }) => (
    <div data-testid="float-dock-anchor" data-enabled={String(enabled)} />
  ),
}));
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

  it("tabs 行右侧显示批量选择与全部已读图标按钮", () => {
    storeState.unreadCount = 2;
    hook.items = [listItem()];
    render(<NotificationsPage />);
    expect(screen.queryByText("选择")).toBeNull();
    expect(screen.getByRole("button", { name: "批量选择" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "全部已读" }));
    expect(hook.markAllRead).toHaveBeenCalled();
  });

  it("点击批量选择进入选择模式，再点取消退出", () => {
    hook.items = [listItem()];
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "批量选择" }));
    expect(screen.getByTestId("bar")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "取消选择" }));
    expect(screen.queryByTestId("bar")).toBeNull();
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
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": expect.stringMatching(/^reply:/),
        },
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

  it("进入批量选择后悬浮 Dock 被禁用", () => {
    hook.items = [listItem()];
    render(<NotificationsPage />);
    expect(screen.getByTestId("float-dock-anchor").dataset.enabled).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "批量选择" }));
    expect(screen.getByTestId("float-dock-anchor").dataset.enabled).toBe("false");
  });

  it("点击全选选中所有已加载消息，再次点击清空", () => {
    hook.items = [listItem({ id: 1 }), listItem({ id: 2 })];
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "批量选择" }));
    expect(screen.getByTestId("bar-count").textContent).toBe("0");
    fireEvent.click(screen.getByText("切换全选"));
    expect(screen.getByTestId("bar-count").textContent).toBe("2");
    expect(screen.getByTestId("bar-all-selected").textContent).toBe("true");
    fireEvent.click(screen.getByText("切换全选"));
    expect(screen.getByTestId("bar-count").textContent).toBe("0");
  });

  it("反选翻转当前选中集合", () => {
    hook.items = [listItem({ id: 1 }), listItem({ id: 2 }), listItem({ id: 3 })];
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "批量选择" }));
    fireEvent.click(screen.getByText("切换全选"));
    expect(screen.getByTestId("bar-count").textContent).toBe("3");
    fireEvent.click(screen.getByText("反选"));
    expect(screen.getByTestId("bar-count").textContent).toBe("0");
  });
});
