import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import Page from "./page";

// mock 所有 Client Components，避免测试依赖浏览器 API 和复杂的上下文
vi.mock("../components/featured", () => ({
  FeaturedCarousel: () => <div data-testid="featured-carousel">FeaturedCarousel</div>,
}));
vi.mock("../components/articles", () => ({
  ArticleSection: () => <div data-testid="article-section">ArticleSection</div>,
}));
vi.mock("../components/snippets", () => ({
  SnippetsSection: () => <div data-testid="snippets-section">SnippetsSection</div>,
}));
vi.mock("../components/sidebar", () => ({
  RecentVisitors: () => <div data-testid="recent-visitors">RecentVisitors</div>,
  TagsCloud: () => <div data-testid="tags-cloud">TagsCloud</div>,
}));

// mock next/navigation（某些子组件可能依赖）
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<Page />)).not.toThrow();
  });

  it("包含推荐文章轮播区域", () => {
    render(<Page />);
    expect(screen.getByTestId("featured-carousel")).toBeInTheDocument();
  });

  it("包含文章列表区域", () => {
    render(<Page />);
    expect(screen.getByTestId("article-section")).toBeInTheDocument();
  });

  it("包含碎语区域", () => {
    render(<Page />);
    expect(screen.getByTestId("snippets-section")).toBeInTheDocument();
  });

  it("包含最近来访模块", () => {
    render(<Page />);
    expect(screen.getByTestId("recent-visitors")).toBeInTheDocument();
  });

  it("包含标签云模块", () => {
    render(<Page />);
    expect(screen.getByTestId("tags-cloud")).toBeInTheDocument();
  });
});
