import type { Metadata } from "next";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import { featuredPosts } from "./_mock/featured-posts";
import { generateMockArticles, MOCK_ARTICLE_PAGE_SIZE } from "./_mock/generate-articles";
import { snippets } from "./_mock/snippets";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import { FeaturedCarousel } from "../components/featured";
import { ArticleSection } from "../components/articles";
import { SnippetsSection } from "../components/snippets";
import { RecentVisitors, TagsCloud } from "../components/sidebar";

export const metadata: Metadata = {
  title: "首页 | Yevpt's Blog",
  description: "分享编程、工具与文学的个人博客",
};

// TODO(Task 8): 替换为真实 SSR 数据获取（fetch /api/articles + /api/categories）
const MOCK_CATEGORIES: CategoryTabItem[] = [
  { id: 1, name: "编程", seq: 0, article_count: 64 },
  { id: 2, name: "工具", seq: 1, article_count: 64 },
  { id: 3, name: "文学", seq: 2, article_count: 64 },
];

function buildMockInitialPage(): ArticlePageResp {
  const allArticles = generateMockArticles();
  const pageSize = MOCK_ARTICLE_PAGE_SIZE;
  const firstPageItems = allArticles.slice(0, pageSize);
  return {
    total: allArticles.length,
    pages: Math.ceil(allArticles.length / pageSize),
    page: 1,
    page_size: pageSize,
    list: firstPageItems.map((a, idx) => ({
      id: idx + 1,
      title: a.title,
      cover_img_url: a.coverImage,
      short_content: a.excerpt,
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: a.views,
      like_count: a.likes,
      comment_count: a.comments,
      is_recommended: false,
      created_at: a.publishedAt.toISOString(),
      updated_at: a.publishedAt.toISOString(),
    })),
  };
}

const MOCK_INITIAL_PAGE = buildMockInitialPage();

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 全宽推荐轮播 */}
      <FeaturedCarousel posts={featuredPosts} />

      {/* 双栏区域：主内容 + 右侧栏 */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* 主内容区 */}
        <div className="min-w-0">
          <ArticleSection initialPage={MOCK_INITIAL_PAGE} categories={MOCK_CATEGORIES} />
        </div>

        {/* 右侧栏（移动端排在后面，PC 端固定在右侧）*/}
        {/* lg:top-20 对应 80px 固定导航栏高度 */}
        <aside className="lg:sticky lg:top-20">
          <SnippetsSection snippets={snippets} />
          <div className="mt-4">
            <RecentVisitors visitors={visitors} />
          </div>
          <TagsCloud tags={tags} />
        </aside>
      </div>
    </div>
  );
}
