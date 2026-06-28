// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { markdownToHtmlSync } from "@repo/markdown";
import {
  ThreadCommentContent,
  ThreadCommentHeader,
  ThreadReplyItem,
  getThreadDisplayName,
} from "./thread-comment-item";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/markdown", () => ({
  markdownToHtmlSync: vi.fn((content: string) => content),
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@/components/common/previewable-markdown", () => ({
  PreviewableMarkdown: ({ html }: { html: string }) => (
    <div data-testid="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => <span data-testid="avatar">{name}</span>,
}));

vi.mock("@/lib/format-time", () => ({
  formatDateTime: () => "2022-01-03 20:56",
}));

describe("getThreadDisplayName", () => {
  it("优先显示 nickname", () => {
    expect(getThreadDisplayName({ username: "alice", nickname: "Alice" })).toBe("Alice");
  });

  it("无用户时显示匿名", () => {
    expect(getThreadDisplayName(undefined)).toBe("匿名");
  });
});

describe("ThreadCommentHeader", () => {
  it("渲染用户名、时间和点赞数", () => {
    render(
      <ThreadCommentHeader
        user={{ id: 1, username: "alice", nickname: "Alice" }}
        createdAt="2026-01-01T00:00:00Z"
        likeCount={2}
        isLiked={false}
        onLike={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.getByText("2022-01-03 20:56")).toBeTruthy();
    expect(screen.getByTestId("like-count").textContent).toBe("2");
  });

  it("linkProfile 时用户名可跳转", () => {
    render(
      <ThreadCommentHeader
        user={{ id: 10, username: "alice", nickname: "Alice" }}
        createdAt="2026-01-01T00:00:00Z"
        likeCount={0}
        isLiked={false}
        onLike={vi.fn()}
        linkProfile
      />,
    );
    const links = screen.getAllByRole("link", { name: "Alice" });
    expect(links.some((link) => link.getAttribute("href") === "/users/10")).toBe(true);
  });
});

describe("ThreadCommentContent", () => {
  it("渲染时把外部链接当作 UGC 处理（留言板/评论正文，与文章/碎语正文区分开）", () => {
    render(<ThreadCommentContent content="你好" />);
    expect(markdownToHtmlSync).toHaveBeenCalledWith("你好", { treatLinksAsUgc: true });
  });
});

describe("ThreadReplyItem", () => {
  it("渲染回复内容时也把外部链接当作 UGC 处理", () => {
    render(
      <ThreadReplyItem
        user={{ id: 1, username: "bob" }}
        createdAt="2026-01-01T00:00:00Z"
        content="回复内容"
        likeCount={0}
        isLiked={false}
        onLike={vi.fn()}
      />,
    );
    expect(markdownToHtmlSync).toHaveBeenCalledWith("回复内容", { treatLinksAsUgc: true });
  });

  it("渲染 @提及 和回复内容", () => {
    render(
      <ThreadReplyItem
        user={{ id: 1, username: "bob", nickname: "Bob" }}
        createdAt="2026-01-01T00:00:00Z"
        content="你好"
        mentionUser={{ id: 2, username: "alice", nickname: "Alice" }}
        likeCount={1}
        isLiked
        onLike={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText("@Alice")).toBeTruthy();
    expect(screen.getByText("你好")).toBeTruthy();
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
  });

  it("点击回复按钮触发回调", async () => {
    const onReply = vi.fn();
    render(
      <ThreadReplyItem
        user={{ id: 1, username: "bob" }}
        createdAt="2026-01-01T00:00:00Z"
        content="test"
        likeCount={0}
        isLiked={false}
        onLike={vi.fn()}
        onReply={onReply}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    expect(onReply).toHaveBeenCalled();
  });
});
