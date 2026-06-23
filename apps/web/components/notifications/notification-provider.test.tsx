import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners = new Map<string, Array<(event: MessageEvent) => void>>();
  close = vi.fn();

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const current = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      current.filter((item) => item !== listener),
    );
  }

  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data: "comment_created" }));
    }
  }
}

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
    ...overrides,
  };
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    useNotificationStore.getState().reset();
    mockUseSession.mockReturnValue({ userId: 1, profile: null });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [notification({ id: 1 })] }), { status: 200 }),
      );
  });

  it("登录后拉取未读数并建立 SSE 连接", async () => {
    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    await waitFor(() => expect(useNotificationStore.getState().unreadCount).toBe(1));
    expect(global.fetch).toHaveBeenCalledWith("/api/notifications/unread-count", undefined);
    expect(MockEventSource.instances[0]?.url).toBe("/api/notifications/stream");
  });

  it("SSE notification 后补拉未读列表，只弹新增未读并可点击跳转", async () => {
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

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    await act(async () => {
      MockEventSource.instances[0]?.emit("notification");
    });

    const toast = await screen.findByRole("button", { name: /新的碎语回复/ });
    await userEvent.click(toast);

    expect(mockPush).toHaveBeenCalledWith("/snippets");
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
    expect(MockEventSource.instances).toHaveLength(0);
  });
});
