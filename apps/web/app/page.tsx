import type { Metadata } from "next";
import { featuredPosts } from "./_mock/featured-posts";
import { snippets } from "./_mock/snippets";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import type { ArticlePageResp, CategoryTabsResp } from "@repo/api";
import { createServerApiClient } from "../lib/server-api";
import { FeaturedCarousel } from "../components/featured";
import { ArticleSection } from "../components/articles";
import { SnippetsSection } from "../components/snippets";
import { RecentVisitors, TagsCloud } from "../components/sidebar";

export const metadata: Metadata = {
  title: "首页 | Yevpt's Blog",
  description: "分享编程、工具与文学的个人博客",
};

const EMPTY_PAGE: ArticlePageResp = { total: 0, pages: 0, page: 1, page_size: 10, list: [] };
const EMPTY_CATEGORIES: CategoryTabsResp = { list: [] };

export default async function Home() {
  const api = await createServerApiClient();
  const [categoriesResp, initialPage] = await Promise.all([
    api.categories.listTabs().catch(() => EMPTY_CATEGORIES),
    api.articles.listPublic({ page: 1 }).catch(() => EMPTY_PAGE),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 全宽推荐轮播 */}
      <FeaturedCarousel posts={featuredPosts} />

      {/* 双栏区域：主内容 + 右侧栏 */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* 主内容区 */}
        <div className="min-w-0">
          <ArticleSection initialPage={initialPage} categories={categoriesResp.list} />
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
