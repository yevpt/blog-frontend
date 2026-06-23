import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { NotificationItemResp } from "@repo/api";

const apiJson = vi.hoisted(() => vi.fn());
const addToast = vi.hoisted(() => vi.fn());

vi.mock("@/lib/client-fetch", () => ({
  apiJson: (...args: unknown[]) => apiJson(...args),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    constructor(status: number) {
      super("api error");
      this.status = status;
    }
  },
  getApiErrorMessage: (_err: unknown, fallback: string) => fallback,
}));
vi.mock("@/lib/toast", () => ({ addToast: (...args: unknown[]) => addToast(...args) }));

import { useNotificationInlineReply } from "./use-notification-inline-reply";

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
    reply_count: 2,
    ...over,
  };
}

describe("useNotificationInlineReply", () => {
  const markRead = vi.fn().mockResolvedValue(undefined);
  const onReplySuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("提交文章评论回复", async () => {
    apiJson.mockResolvedValue({ id: 99 });
    const { result } = renderHook(() => useNotificationInlineReply({ markRead, onReplySuccess }));

    let ok = false;
    await act(async () => {
      ok = await result.current.submitReply(listItem(), "  好的  ");
    });

    expect(ok).toBe(true);
    expect(markRead).toHaveBeenCalledWith(1);
    expect(apiJson).toHaveBeenCalledWith("/api/articles/comments/42/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent_reply_id: 0, content: "好的" }),
    });
    expect(onReplySuccess).toHaveBeenCalledWith(1, 3);
    expect(addToast).toHaveBeenCalledWith("回复成功", "success");
  });

  it("已读消息不再 markRead", async () => {
    apiJson.mockResolvedValue({ id: 99 });
    const { result } = renderHook(() => useNotificationInlineReply({ markRead, onReplySuccess }));

    await act(async () => {
      await result.current.submitReply(listItem({ is_read: true }), "好的");
    });

    expect(markRead).not.toHaveBeenCalled();
  });

  it("无法推断回复目标时不发请求", async () => {
    const { result } = renderHook(() => useNotificationInlineReply({ markRead, onReplySuccess }));

    let ok = true;
    await act(async () => {
      ok = await result.current.submitReply(
        listItem({ source_type: "reply", source_id: 9 }),
        "好的",
      );
    });

    expect(ok).toBe(false);
    expect(apiJson).not.toHaveBeenCalled();
  });
});
