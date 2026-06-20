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
  formatDateTime: () => "2020-04-17 15:54",
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

  it("like_count 为 0 时显示 0", () => {
    render(<GuestbookItem item={{ ...mockItem, like_count: 0 }} />);
    expect(screen.getByTestId("like-count").textContent).toBe("0");
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

  it("无论是否点赞均有心跳动效", () => {
    const { container, rerender } = render(
      <GuestbookItem item={{ ...mockItem, is_liked: false }} />,
    );
    expect(
      container.querySelector(".animate-\\[heartbeat_3s_ease-in-out_infinite\\]"),
    ).toBeTruthy();

    rerender(<GuestbookItem item={{ ...mockItem, is_liked: true }} />);
    expect(
      container.querySelector(".animate-\\[heartbeat_3s_ease-in-out_infinite\\]"),
    ).toBeTruthy();
  });

  it("点赞与未点赞均使用 heart-fill 图标", () => {
    const { rerender } = render(<GuestbookItem item={{ ...mockItem, is_liked: false }} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
    expect(screen.queryByTestId("icon-heart")).toBeNull();

    rerender(<GuestbookItem item={{ ...mockItem, is_liked: true }} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
    expect(screen.queryByTestId("icon-heart")).toBeNull();
  });

  it("显示格式化的发布时间", () => {
    render(<GuestbookItem item={mockItem} />);
    expect(screen.getByText("2020-04-17 15:54")).toBeTruthy();
  });

  it("不显示用户身份标签和站点链接", () => {
    render(
      <GuestbookItem
        item={{
          ...mockItem,
          user: { ...mockItem.user!, mark: "ADMIN", site: "https://blog.ncgame.cc/" },
        }}
      />,
    );
    expect(screen.queryByText("ADMIN")).toBeNull();
    expect(screen.queryByText("blog.ncgame.cc/")).toBeNull();
  });

  it("无回复时使用 pb-2，有回复时使用 pb-5", () => {
    const { container, rerender } = render(<GuestbookItem item={mockItem} />);
    expect(container.firstElementChild?.className).toContain("pt-4");
    expect(container.firstElementChild?.className).toContain("pb-2");
    expect(container.firstElementChild?.className).not.toContain("pb-5");

    rerender(<GuestbookItem item={{ ...mockItem, reply_count: 3 }} />);
    expect(container.firstElementChild?.className).toContain("pt-4");
    expect(container.firstElementChild?.className).toContain("pb-5");
    expect(container.firstElementChild?.className).not.toContain("pb-2");
  });
});
