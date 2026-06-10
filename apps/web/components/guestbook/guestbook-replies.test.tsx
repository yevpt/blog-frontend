// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GuestbookReplies } from "./guestbook-replies";
import type { CommentReplyPageResp } from "@repo/api";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name?: string }) => <div data-testid="reply-avatar" aria-label={name} />,
}));

vi.mock("@/lib/format-time", () => ({
  formatRelativeTime: () => "刚刚",
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("@/hooks/use-guestbook-like", () => ({
  useGuestbookLike: () => ({
    toggleReplyLike: vi.fn().mockResolvedValue({ is_liked: true, like_count: 1 }),
  }),
}));

const mockReplyPage: CommentReplyPageResp = {
  total: 1,
  pages: 1,
  page: 1,
  page_size: 5,
  list: [
    {
      id: 10,
      target_type: "guestbook",
      comment_id: 1,
      from_user_id: 2,
      to_user_id: 1,
      parent_reply_id: 0,
      content: "回复内容",
      from_user: { id: 2, username: "bob", nickname: "Bob" },
      like_count: 0,
      is_liked: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
};

describe("GuestbookReplies", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("replyCount > 0 时显示展开按钮", () => {
    render(
      <GuestbookReplies guestbookId={1} replyCount={2} pendingReply={null} onReply={vi.fn()} />,
    );
    expect(screen.getByText(/展开 2 条回复/)).toBeTruthy();
  });

  it("replyCount <= 0 时不渲染", () => {
    const { container } = render(
      <GuestbookReplies guestbookId={1} replyCount={0} pendingReply={null} onReply={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("点击展开按钮后加载并显示回复", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReplyPage,
    } as Response);

    render(
      <GuestbookReplies guestbookId={1} replyCount={1} pendingReply={null} onReply={vi.fn()} />,
    );
    await userEvent.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => {
      expect(screen.getByText("回复内容")).toBeTruthy();
    });
  });

  it("展开后显示收起按钮", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReplyPage,
    } as Response);

    render(
      <GuestbookReplies guestbookId={1} replyCount={1} pendingReply={null} onReply={vi.fn()} />,
    );
    await userEvent.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => {
      expect(screen.getByText("收起回复")).toBeTruthy();
    });
  });
});
