import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleHero } from "./article-hero";
import type { ArticleDetailResp } from "@repo/api";

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
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

  it("无封面图时不渲染 img", () => {
    render(<ArticleHero article={base} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("有封面图时渲染 img 并使用 alt 文字", () => {
    render(<ArticleHero article={{ ...base, cover_img_url: "https://example.com/img.jpg" }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("img.jpg"));
    expect(img).toHaveAttribute("alt", "Rust Web 框架");
  });

  it("显示分类标签", () => {
    render(<ArticleHero article={{ ...base, category: { id: 1, name: "Technology" } }} />);
    expect(screen.getByText("Technology")).toBeInTheDocument();
  });

  it("显示预计阅读时长", () => {
    render(<ArticleHero article={base} />);
    expect(screen.getByText(/分钟阅读/)).toBeInTheDocument();
  });

  it("有 user 时显示作者头像", () => {
    const user = {
      id: 1,
      username: "vpt940417",
      nickname: "Vpt",
      avatar_url: "https://example.com/avatar.jpg",
    };
    render(<ArticleHero article={{ ...base, user }} />);
    const avatar = screen.getByAltText("Vpt");
    expect(avatar).toHaveAttribute("src", expect.stringContaining("avatar.jpg"));
  });

  it("有 user 时显示作者昵称", () => {
    const user = {
      id: 1,
      username: "vpt940417",
      nickname: "Vpt",
      avatar_url: "https://example.com/avatar.jpg",
      mark: "博主、前端攻城狮",
    };
    render(<ArticleHero article={{ ...base, user }} />);
    expect(screen.getByText("Vpt")).toBeInTheDocument();
    expect(screen.getByText("博主、前端攻城狮")).toBeInTheDocument();
  });

  it("无 user 时不渲染作者区块", () => {
    render(<ArticleHero article={base} />);
    expect(screen.queryByText(/博主/)).not.toBeInTheDocument();
  });
});
