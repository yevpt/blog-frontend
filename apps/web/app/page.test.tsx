import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import Page from "./page";

const homePageMockState = vi.hoisted(() => {
  const listPublic = vi.fn();
  const listTabs = vi.fn();
  const featuredCarousel = vi.fn();
  const listMomentsPublic = vi.fn();

  return {
    listPublic,
    listTabs,
    featuredCarousel,
    listMomentsPublic,
  };
});

vi.mock("@/components/featured", () => ({
  FeaturedCarousel: ({ posts }: { posts: unknown[] }) => {
    homePageMockState.featuredCarousel(posts);
    return <div data-testid="featured-carousel">FeaturedCarousel</div>;
  },
}));
vi.mock("@/components/articles", () => ({
  ArticleSection: ({ sidebar }: { sidebar?: ReactNode }) => (
    <section data-testid="article-section">
      <div data-testid="home-articles-header">
        <span>最新文章</span>
        <span>近期在写什么</span>
        <div data-testid="article-list-header">ArticleListHeader</div>
      </div>
      {sidebar}
    </section>
  ),
}));
vi.mock("@/components/snippets", () => ({
  SnippetsSection: () => <div data-testid="snippets-section">SnippetsSection</div>,
}));
vi.mock("@/components/sidebar", () => ({
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
      listPublic: homePageMockState.listPublic,
    },
    categories: {
      listTabs: homePageMockState.listTabs,
    },
    moments: {
      listPublic: homePageMockState.listMomentsPublic,
    },
  }),
}));

describe("Home page", () => {
  beforeEach(() => {
    homePageMockState.listPublic.mockReset();
    homePageMockState.listTabs.mockReset();
    homePageMockState.listMomentsPublic.mockReset();
    homePageMockState.featuredCarousel.mockReset();

    homePageMockState.listPublic.mockResolvedValue({
      total: 0,
      pages: 0,
      page: 1,
      page_size: 10,
      list: [],
    });
    homePageMockState.listTabs.mockResolvedValue({ list: [] });
    homePageMockState.listMomentsPublic.mockResolvedValue({
      total: 0,
      pages: 0,
      page: 1,
      page_size: 3,
      list: [],
    });
  });

  it("渲染不崩溃", async () => {
    const element = await Page();
    expect(() => render(element)).not.toThrow();
  });

  it("包含推荐文章轮播区域", async () => {
    render(await Page());
    expect(screen.getByTestId("featured-carousel")).toBeInTheDocument();
  });

  it("请求推荐文章作为轮播数据，分页数量固定为 5", async () => {
    render(await Page());

    expect(homePageMockState.listPublic).toHaveBeenCalledWith({
      page: 1,
      page_size: 5,
      recommend: true,
    });
  });

  it("将推荐文章接口数据映射给轮播组件", async () => {
    homePageMockState.listPublic.mockImplementation(async (req: { recommend?: boolean }) => {
      if (!req.recommend) {
        return { total: 0, pages: 0, page: 1, page_size: 10, list: [] };
      }

      return {
        total: 1,
        pages: 1,
        page: 1,
        page_size: 5,
        list: [
          {
            id: 42,
            title: "真实推荐文章",
            cover_img_url: "https://example.com/cover.jpg",
            short_content: "来自后端的推荐摘要",
            user_id: 1,
            status: 1,
            comment_status: 1,
            read_count: 12,
            like_count: 3,
            is_liked: false,
            comment_count: 4,
            is_recommended: true,
            category: { id: 7, name: "编程" },
            created_at: "2026-05-01T08:00:00Z",
            updated_at: "2026-05-02T08:00:00Z",
          },
        ],
      };
    });

    render(await Page());

    expect(homePageMockState.featuredCarousel).toHaveBeenCalledWith([
      {
        id: "42",
        title: "真实推荐文章",
        excerpt: "来自后端的推荐摘要",
        coverImage: "https://example.com/cover.jpg",
        category: "编程",
        date: "2026-05-01T08:00:00Z",
        href: "/articles/42",
      },
    ]);
  });

  it("同时请求分类、最新文章、推荐文章和碎语", async () => {
    render(await Page());

    expect(homePageMockState.listTabs).toHaveBeenCalledOnce();
    expect(homePageMockState.listPublic).toHaveBeenCalledWith({ page: 1 });
    expect(homePageMockState.listPublic).toHaveBeenCalledWith({
      page: 1,
      page_size: 5,
      recommend: true,
    });
    expect(homePageMockState.listMomentsPublic).toHaveBeenCalledWith({
      page: 1,
      page_size: 3,
      user_id: 1,
    });
  });

  it("推荐轮播位于页面内容容器之前，形成首屏 Hero", async () => {
    const { container } = render(await Page());
    const hero = screen.getByTestId("featured-carousel");
    const body = container.querySelector('[data-testid="home-page-body"]');

    expect(body).toBeInTheDocument();
    expect(hero.compareDocumentPosition(body!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("包含文章列表区域", async () => {
    render(await Page());
    expect(screen.getByTestId("article-section")).toBeInTheDocument();
  });

  it("文章标题与分类 Tabs 跨在主栏和侧边栏上方", async () => {
    render(await Page());
    const body = screen.getByTestId("home-page-body");

    expect(screen.getByText("最新文章")).toBeInTheDocument();
    expect(screen.getByText("近期在写什么")).toBeInTheDocument();
    expect(screen.getByTestId("article-list-header")).toBeInTheDocument();
    expect(body).toContainElement(screen.getByTestId("home-articles-header"));
  });

  it("大屏下中心内容宽度增加，缓解文章卡片拥挤", async () => {
    render(await Page());
    expect(screen.getByTestId("home-page-body").className).toContain("max-w-[1120px]");
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
