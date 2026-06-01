import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "./page";

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
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

// vi.mock 工厂会被提升（hoisted），mock 数据必须内联定义，不能引用外部变量
vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: {
      listPublic: async () => ({ total: 0, pages: 0, page: 1, page_size: 10, list: [] }),
    },
    categories: {
      listTabs: async () => ({ list: [] }),
    },
  }),
}));

describe("Home page", () => {
  it("渲染不崩溃", async () => {
    const element = await Page();
    expect(() => render(element)).not.toThrow();
  });

  it("包含推荐文章轮播区域", async () => {
    render(await Page());
    expect(screen.getByTestId("featured-carousel")).toBeInTheDocument();
  });

  it("包含文章列表区域", async () => {
    render(await Page());
    expect(screen.getByTestId("article-section")).toBeInTheDocument();
  });

  it("包含碎语区域", async () => {
    render(await Page());
    expect(screen.getByTestId("snippets-section")).toBeInTheDocument();
  });

  it("包含最近来访模块", async () => {
    render(await Page());
    expect(screen.getByTestId("recent-visitors")).toBeInTheDocument();
  });

  it("包含标签云模块", async () => {
    render(await Page());
    expect(screen.getByTestId("tags-cloud")).toBeInTheDocument();
  });
});
