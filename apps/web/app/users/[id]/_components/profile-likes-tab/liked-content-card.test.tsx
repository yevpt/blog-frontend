import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { UserLikedContentItemResp } from "@repo/api";
import { LikedContentCard } from "./liked-content-card";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => <span data-testid="avatar">{name}</span>,
}));

vi.mock("@/components/common/relative-time", () => ({
  RelativeTime: () => <time data-testid="relative-time" />,
}));

vi.mock("@/lib/user-roles", () => ({
  isVipUser: () => false,
}));

function makeItem(overrides: Partial<UserLikedContentItemResp> = {}): UserLikedContentItemResp {
  return {
    id: 1,
    liked_at: "2026-06-01T10:00:00Z",
    kind: "article",
    filter: "article",
    author: { id: 2, nickname: "作者甲" },
    content: { id: 10, excerpt: "文章摘要", title: "文章标题" },
    ...overrides,
  };
}

describe("LikedContentCard", () => {
  it("渲染文章卡片：标题、摘要、打开文章", () => {
    render(<LikedContentCard item={makeItem()} />);
    const card = screen.getByTestId("liked-content-card");

    expect(within(card).getByText("赞过文章")).toBeInTheDocument();
    expect(within(card).getByTestId("icon-heart-fill")).toBeInTheDocument();
    expect(within(card).getByText("文章标题")).toBeInTheDocument();
    expect(within(card).getByText("文章摘要")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /打开文章/ })).toHaveAttribute(
      "href",
      "/articles/10",
    );
    expect(within(card).getByTestId("icon-arrow-up-right")).toBeInTheDocument();
  });

  it("渲染碎语卡片", () => {
    render(
      <LikedContentCard
        item={makeItem({
          kind: "moment",
          filter: "moment",
          content: { id: 3, excerpt: "碎语正文" },
        })}
      />,
    );
    const card = screen.getByTestId("liked-content-card");

    expect(within(card).getByText("赞过碎语")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /打开碎语/ })).toHaveAttribute(
      "href",
      "/snippets",
    );
  });

  it("渲染留言卡片", () => {
    render(
      <LikedContentCard
        item={makeItem({
          kind: "guestbook",
          filter: "guestbook",
          content: { id: 8, excerpt: "留言正文" },
        })}
      />,
    );
    const card = screen.getByTestId("liked-content-card");

    expect(within(card).getByText("赞过留言")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /打开留言板/ })).toHaveAttribute(
      "href",
      "/guestbook",
    );
  });

  it("渲染评论卡片与来源上下文", () => {
    render(
      <LikedContentCard
        item={makeItem({
          kind: "comment",
          filter: "comment",
          content: { id: 5, excerpt: "评论正文" },
          root: { kind: "moment", id: 7, excerpt: "碎语来源" },
        })}
      />,
    );

    expect(screen.getByText("赞过评论")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "来自碎语：碎语来源" })).toHaveAttribute(
      "href",
      "/snippets",
    );
  });

  it("渲染回复卡片的 parent 引用块", () => {
    render(
      <LikedContentCard
        item={makeItem({
          kind: "reply",
          filter: "comment",
          content: { id: 12, excerpt: "@某人 回复摘要" },
          parent: { kind: "comment", id: 5, excerpt: "父评论内容" },
          root: { kind: "article", id: 20, title: "根文章" },
        })}
      />,
    );
    const card = screen.getByTestId("liked-content-card");

    expect(within(card).getByText("赞过回复")).toBeInTheDocument();
    expect(within(card).getByText("回复自评论")).toBeInTheDocument();
    expect(within(card).getByText(/父评论内容/)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "来自文章：根文章" })).toHaveAttribute(
      "href",
      "/articles/20#comment-12",
    );
  });

  it("高亮 @提及", () => {
    render(
      <LikedContentCard
        item={makeItem({
          kind: "reply",
          filter: "comment",
          content: { id: 12, excerpt: "@VPT 回复摘要" },
          root: { kind: "article", id: 20, title: "根文章" },
        })}
      />,
    );

    expect(screen.getByText("@VPT")).toHaveClass("text-sky-500");
  });

  it("reply_to 存在时补 @ 提及", () => {
    render(
      <LikedContentCard
        item={makeItem({
          kind: "reply",
          filter: "comment",
          content: { id: 12, excerpt: "111" },
          reply_to: { id: 2, nickname: "VPT" },
          root: { kind: "article", id: 20, title: "根文章" },
        })}
      />,
    );

    const mention = screen.getByRole("link", { name: "@VPT" });
    expect(mention).toHaveAttribute("href", "/users/2");
    expect(screen.getByText("111")).toBeInTheDocument();
  });

  it("内容已删除时展示删除文案", () => {
    render(
      <LikedContentCard
        item={makeItem({
          content: { id: 10, excerpt: "", title: "标题", deleted: true },
        })}
      />,
    );

    expect(screen.getByText("内容已删除")).toBeInTheDocument();
    expect(screen.getByText("原内容已不可访问")).toBeInTheDocument();
  });
});
