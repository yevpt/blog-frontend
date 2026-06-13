// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookItem } from "./guestbook-item";
import type { GuestbookItemResp } from "@repo/api";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/markdown", () => ({
  markdownToHtmlSync: (content: string) => content,
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name?: string }) => <div data-testid="avatar" aria-label={name} />,
}));

vi.mock("@/lib/format-time", () => ({
  formatRelativeTime: () => "刚刚",
}));

const mockItem: GuestbookItemResp = {
  id: 1,
  owner_user_id: 0,
  from_user_id: 1,
  content: "这是一条留言",
  user: { id: 1, username: "alice", nickname: "Alice" },
  reply_count: 0,
  like_count: 3,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("GuestbookItem", () => {
  it("渲染留言内容和用户名", () => {
    render(<GuestbookItem item={mockItem} />);
    expect(screen.getByText("这是一条留言")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("显示 like_count", () => {
    render(<GuestbookItem item={mockItem} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("点击点赞按钮调用 onLike", async () => {
    const onLike = vi.fn();
    render(<GuestbookItem item={mockItem} onLike={onLike} />);
    await userEvent.click(screen.getByRole("button", { name: /点赞/ }));
    expect(onLike).toHaveBeenCalledWith(1);
  });

  it("点击回复按钮调用 onReply", async () => {
    const onReply = vi.fn();
    render(<GuestbookItem item={mockItem} onReply={onReply} />);
    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ commentId: 1 }));
  });

  it("is_liked 时显示 heart-fill 图标", () => {
    render(<GuestbookItem item={{ ...mockItem, is_liked: true }} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("有 mark 时显示身份标签", () => {
    render(<GuestbookItem item={{ ...mockItem, user: { ...mockItem.user!, mark: "博主" } }} />);
    expect(screen.getByText("博主")).toBeTruthy();
  });
});
