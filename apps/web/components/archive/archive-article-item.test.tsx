import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ArticleListItemResp } from "@repo/api";
import { ArchiveArticleItem } from "./archive-article-item";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeArticle(overrides: Partial<ArticleListItemResp> = {}): ArticleListItemResp {
  return {
    id: 7,
    title: "深入理解 React Server Components",
    user_id: 1,
    status: 1,
    comment_status: 1,
    read_count: 0,
    like_count: 0,
    is_liked: false,
    comment_count: 0,
    is_recommended: false,
    created_at: "2024-06-24T03:00:00Z",
    updated_at: "2024-06-24T03:00:00Z",
    ...overrides,
  };
}

describe("ArchiveArticleItem", () => {
  it("渲染标题链接，指向文章详情页", () => {
    render(<ArchiveArticleItem article={makeArticle()} />);

    const link = screen.getByRole("link", { name: "深入理解 React Server Components" });
    expect(link).toHaveAttribute("href", "/articles/7");
  });

  it("渲染 MM-DD 紧凑日期，dateTime 保留原始时间", () => {
    render(<ArchiveArticleItem article={makeArticle()} />);

    const time = screen.getByRole("time");
    // 2024-06-24T03:00:00Z 北京时间 11:00，仍为 06-24
    expect(time).toHaveTextContent("06-24");
    expect(time).toHaveAttribute("dateTime", "2024-06-24T03:00:00Z");
  });

  it("有分类时渲染分类名", () => {
    render(<ArchiveArticleItem article={makeArticle({ category: { id: 1, name: "编程" } })} />);

    expect(screen.getByText("编程")).toBeInTheDocument();
  });

  it("无分类时不渲染分类区域", () => {
    render(<ArchiveArticleItem article={makeArticle()} />);

    expect(screen.queryByText("编程")).not.toBeInTheDocument();
  });
});
