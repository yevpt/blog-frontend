import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ArticleListItemResp } from "@repo/api";
import { ArchivePage } from "./archive-page";

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

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  FadeInUp: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

function makeArticle(
  id: number,
  createdAt: string,
  overrides: Partial<ArticleListItemResp> = {},
): ArticleListItemResp {
  return {
    id,
    title: `文章 ${id}`,
    user_id: 1,
    status: 1,
    comment_status: 1,
    read_count: 0,
    like_count: 0,
    is_liked: false,
    comment_count: 0,
    is_recommended: false,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

describe("ArchivePage", () => {
  it("渲染页头与统计信息", () => {
    const articles = [
      makeArticle(1, "2024-06-01T00:00:00Z"),
      makeArticle(2, "2023-03-01T00:00:00Z"),
    ];

    render(<ArchivePage articles={articles} />);

    expect(screen.getByRole("heading", { level: 1, name: "时光有迹可循" })).toBeInTheDocument();
    expect(screen.getByText("共 2 篇文章，记录始于 2023 年")).toBeInTheDocument();
  });

  it("按年份降序渲染分组与文章链接", () => {
    const articles = [
      makeArticle(1, "2024-06-01T00:00:00Z"),
      makeArticle(2, "2023-03-01T00:00:00Z"),
      makeArticle(3, "2024-01-01T00:00:00Z"),
    ];

    render(<ArchivePage articles={articles} />);

    const yearHeadings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(yearHeadings).toEqual(["2024", "2023"]);

    expect(screen.getByText("2 篇")).toBeInTheDocument();
    expect(screen.getByText("1 篇")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/articles/1",
      "/articles/3",
      "/articles/2",
    ]);
  });

  it("空列表时渲染空状态", () => {
    render(<ArchivePage articles={[]} />);

    expect(screen.getByText("还没有公开文章，敬请期待。")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
});
