// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { markdownToHtmlSync } from "@repo/markdown";
import type { ModerationView } from "@repo/api";
import {
  ThreadCommentContent,
  ThreadCommentHeader,
  ThreadReplyItem,
  getThreadDisplayName,
} from "./thread-comment-item";

const placeholderModeration: ModerationView = {
  public_state: "placeholder",
  display_version: "none",
  has_pending_revision: true,
  pending_risk_level: "medium",
  can_interact: false,
};

const visibleLowPendingModeration: ModerationView = {
  public_state: "visible",
  display_version: "last_approved",
  has_pending_revision: true,
  pending_risk_level: "low",
  can_interact: true,
};

const visibleMediumPendingModeration: ModerationView = {
  public_state: "visible",
  display_version: "last_approved",
  has_pending_revision: true,
  pending_risk_level: "medium",
  can_interact: true,
};

const forbiddenVisibleModeration: ModerationView = {
  public_state: "visible",
  display_version: "last_approved",
  has_pending_revision: false,
  can_interact: false,
};

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
  wrapMarkdownImagesWithSkeletonHtml: (h: string) => h,
  deferMarkdownImageSources: (h: string) => h,
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

  describe("审核展示", () => {
    it("ThreadCommentContent 在 public_state=placeholder 时访客渲染安全占位而非 markdown", () => {
      const { container } = render(
        <ThreadCommentContent content="敏感内容" moderation={placeholderModeration} />,
      );
      expect(screen.getByText("等待人工审核")).toBeTruthy();
      const markdown = container.querySelector('[data-testid="markdown-body"]');
      expect(markdown).toBeNull();
    });

    it("ThreadCommentContent 在 public_state=placeholder 时作者渲染 pending_content", () => {
      const { container } = render(
        <ThreadCommentContent
          content=""
          moderation={{
            ...placeholderModeration,
            pending_content: "作者待审评论",
          }}
          isOwner
        />,
      );
      expect(screen.getByText("作者待审评论")).toBeTruthy();
      expect(screen.queryByText("等待人工审核")).toBeNull();
      expect(container.querySelector('[data-testid="markdown-body"]')).toBeTruthy();
    });

    it("ThreadCommentContent 在 visible + has_pending_revision 时仍渲染 markdown（Badge 由 Header 渲染）", () => {
      const { container } = render(
        <ThreadCommentContent content="旧内容" moderation={visibleLowPendingModeration} />,
      );
      expect(screen.getByText("旧内容")).toBeTruthy();
      const markdown = container.querySelector('[data-testid="markdown-body"]');
      expect(markdown).toBeTruthy();
    });

    it("ThreadCommentHeader 在低风险待审核时渲染「待审核」Badge", () => {
      render(
        <ThreadCommentHeader
          user={{ id: 1, username: "alice", nickname: "Alice" }}
          createdAt="2026-01-01T00:00:00Z"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          moderation={visibleLowPendingModeration}
        />,
      );
      expect(screen.getByText("待审核")).toBeTruthy();
    });

    it("ThreadCommentHeader 在中风险待审时渲染「等待人工审核」Badge", () => {
      render(
        <ThreadCommentHeader
          user={{ id: 1, username: "alice", nickname: "Alice" }}
          createdAt="2026-01-01T00:00:00Z"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          moderation={visibleMediumPendingModeration}
        />,
      );
      expect(screen.getByText("等待人工审核")).toBeTruthy();
    });

    it("ThreadReplyItem 在 placeholder 时访客显示占位而非 markdown 内容", () => {
      const { container } = render(
        <ThreadReplyItem
          user={{ id: 1, username: "bob" }}
          createdAt="2026-01-01T00:00:00Z"
          content="敏感内容"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          moderation={placeholderModeration}
        />,
      );
      expect(screen.getAllByText("等待人工审核").length).toBeGreaterThan(0);
      const markdown = container.querySelector('[data-testid="markdown-body"]');
      expect(markdown).toBeNull();
    });

    it("ThreadReplyItem 在 placeholder 时作者渲染 pending_content", () => {
      render(
        <ThreadReplyItem
          user={{ id: 1, username: "bob" }}
          createdAt="2026-01-01T00:00:00Z"
          content=""
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          moderation={{
            ...placeholderModeration,
            pending_content: "作者待审回复",
          }}
          isOwner
        />,
      );
      expect(screen.getByText("作者待审回复")).toBeTruthy();
    });

    it("ThreadReplyItem 在 visible + pending 时显示 badge 与 markdown content", () => {
      render(
        <ThreadReplyItem
          user={{ id: 1, username: "bob" }}
          createdAt="2026-01-01T00:00:00Z"
          content="正文"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          moderation={visibleLowPendingModeration}
        />,
      );
      expect(screen.getByText("正文")).toBeTruthy();
      expect(screen.getByText("待审核")).toBeTruthy();
    });
  });

  describe("can_interact=false 禁用互动", () => {
    it("ThreadCommentHeader can_interact=false 时隐藏点赞与回复按钮", () => {
      render(
        <ThreadCommentHeader
          user={{ id: 1, username: "alice", nickname: "Alice" }}
          createdAt="2026-01-01T00:00:00Z"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          onReply={vi.fn()}
          moderation={forbiddenVisibleModeration}
        />,
      );
      expect(screen.queryByRole("button", { name: /点赞/ })).toBeNull();
      expect(screen.queryByRole("button", { name: "回复" })).toBeNull();
    });

    it("ThreadReplyItem can_interact=false 时隐藏点赞与回复按钮", () => {
      render(
        <ThreadReplyItem
          user={{ id: 1, username: "bob" }}
          createdAt="2026-01-01T00:00:00Z"
          content="内容"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          onReply={vi.fn()}
          moderation={forbiddenVisibleModeration}
        />,
      );
      expect(screen.queryByRole("button", { name: /点赞/ })).toBeNull();
      expect(screen.queryByRole("button", { name: "回复" })).toBeNull();
    });

    it("ThreadReplyItem can_interact=false 但作者删除按钮仍可见", () => {
      render(
        <ThreadReplyItem
          user={{ id: 1, username: "bob" }}
          createdAt="2026-01-01T00:00:00Z"
          content="内容"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          onDelete={vi.fn()}
          moderation={forbiddenVisibleModeration}
        />,
      );
      expect(screen.getByRole("button", { name: "删除回复" })).toBeTruthy();
    });
  });

  describe("作者编辑入口", () => {
    it("ThreadCommentHeader 提供 onEdit 时渲染「编辑」按钮", () => {
      render(
        <ThreadCommentHeader
          user={{ id: 1, username: "alice", nickname: "Alice" }}
          createdAt="2026-01-01T00:00:00Z"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
      expect(screen.getByRole("button", { name: "编辑评论" })).toBeTruthy();
    });

    it("ThreadReplyItem 提供 onEdit 时渲染「编辑回复」按钮", () => {
      render(
        <ThreadReplyItem
          user={{ id: 1, username: "bob" }}
          createdAt="2026-01-01T00:00:00Z"
          content="内容"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
      expect(screen.getByRole("button", { name: "编辑回复" })).toBeTruthy();
    });

    it("点击 ThreadCommentHeader 的编辑按钮触发 onEdit", async () => {
      const onEdit = vi.fn();
      render(
        <ThreadCommentHeader
          user={{ id: 1, username: "alice" }}
          createdAt="2026-01-01T00:00:00Z"
          likeCount={0}
          isLiked={false}
          onLike={vi.fn()}
          onEdit={onEdit}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "编辑评论" }));
      expect(onEdit).toHaveBeenCalled();
    });
  });
});
