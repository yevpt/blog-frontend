import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { NotificationItemResp } from "@repo/api";
import { NotificationProvider } from "./notification-provider";
import { useNotificationStore } from "@/store/use-notification-store";

const mockPush = vi.fn();
const mockUseSession = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => mockUseSession(),
}));

function notification(overrides: Partial<NotificationItemResp>): NotificationItemResp {
  return {
    id: 1,
    event_id: 1,
    type: "comment_created",
    title: "新评论",
    content_excerpt: "写得真好",
    is_read: false,
    created_at: "2026-06-23T00:00:00Z",
    source_type: "comment",
    source_id: 2,
    root_type: "article",
    root_id: 3,
    source_deleted: false,
    root_deleted: false,
    ...overrides,
  };
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal("EventSource", vi.fn());
    useNotificationStore.getState().reset();
    mockUseSession.mockReturnValue({ userId: 1, profile: null });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [notification({ id: 1 })] }), { status: 200 }),
      );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("登录后立即拉取未读数和最新未读快照且不建立 SSE 连接", async () => {
    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    await flushAsyncWork();
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/notifications/unread-count", undefined);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications?unread_only=true&page=1&page_size=5",
      undefined,
    );
    expect(global.EventSource).not.toHaveBeenCalled();
  });

  it("轮询时未读数不变只刷新 count，不补拉列表", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [notification({ id: 1 })] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }));

    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    await flushAsyncWork();
    expect(useNotificationStore.getState().unreadCount).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(8000);
    });
    await flushAsyncWork();

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenLastCalledWith("/api/notifications/unread-count", undefined);
    expect(useNotificationStore.getState().listSyncVersion).toBe(0);
  });

  it("轮询发现未读数变化后补拉最新未读，只弹新增未读并可点击跳转", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [notification({ id: 1 })] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 2 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            list: [notification({ id: 2, root_id: 9, title: "新的碎语回复", root_type: "moment" })],
          }),
          { status: 200 },
        ),
      );

    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    await flushAsyncWork();
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    await act(async () => {
      vi.advanceTimersByTime(8000);
    });
    await flushAsyncWork();

    expect(useNotificationStore.getState().listSyncVersion).toBe(1);

    const toast = screen.getByRole("button", { name: /新的碎语回复/ });
    fireEvent.click(toast);

    expect(mockPush).toHaveBeenCalledWith("/moments");
  });

  it("未登录时重置未读数且不建立 SSE", () => {
    useNotificationStore.getState().setUnreadCount(5);
    mockUseSession.mockReturnValue({ userId: null, profile: null });

    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(global.EventSource).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
