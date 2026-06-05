import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleHero } from "./article-hero";
import type { ArticleDetailResp } from "@repo/api";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    _fill,
    className,
    _priority,
  }: {
    src: string;
    alt: string;
    _fill?: boolean;
    className?: string;
    _priority?: boolean;
  }) => <img src={src} alt={alt} className={className} />,
}));

const base: ArticleDetailResp = {
  id: 1,
  title: "Rust Web 框架",
  content: "# Hello",
  user_id: 1,
  status: 1,
  comment_status: 1,
  read_count: 1234,
  like_count: 88,
  comment_count: 12,
  is_recommended: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

describe("ArticleHero", () => {
  it("渲染文章标题", () => {
    render(<ArticleHero article={base} />);
    expect(screen.getByRole("heading", { name: "Rust Web 框架" })).toBeInTheDocument();
  });

  it("显示阅读数和点赞数", () => {
    render(<ArticleHero article={base} />);
    expect(screen.getByText(/1,234/)).toBeInTheDocument();
    expect(screen.getByText(/88/)).toBeInTheDocument();
  });

  it("无封面图时渲染占位背景", () => {
    const { container } = render(<ArticleHero article={base} />);
    expect((container.firstChild as HTMLElement).className).toMatch(/from-muted/);
  });

  it("有封面图时渲染 img", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: "https://example.com/img.jpg" }} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", expect.stringContaining("img.jpg"));
  });

  it("显示分类标签", () => {
    render(<ArticleHero article={{ ...base, category: { id: 1, name: "Technology" } }} />);
    expect(screen.getByText("Technology")).toBeInTheDocument();
  });
});
