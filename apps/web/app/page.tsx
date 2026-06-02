import type { Metadata } from "next";
import { featuredPosts } from "./_mock/featured-posts";
import { snippets } from "./_mock/snippets";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import type { ArticlePageResp, CategoryTabsResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { FeaturedCarousel } from "@/components/featured";
import { ArticleSection } from "@/components/articles";
import { SnippetsSection } from "@/components/snippets";
import { RecentVisitors, TagsCloud } from "@/components/sidebar";

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
    <>
      {/* 全宽精选轮播 Hero（从顶部开始，覆盖 Navbar） */}
      <FeaturedCarousel posts={featuredPosts} />

      <div className="max-w-[960px] mx-auto px-5 py-9 pb-20">
        {/* 全宽文章区标题（两列上方） */}
        <div className="mb-6">
          <p className="text-xs font-bold tracking-widest uppercase text-accent mb-1">最新文章</p>
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground mb-5">
            近期在写什么
          </h2>
        </div>

        {/* 两列区域：文章区（含 Tabs）+ 侧边栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-6 items-start">
          <main className="min-w-0">
            <ArticleSection initialPage={initialPage} categories={categoriesResp.list} />
          </main>
          <aside className="lg:sticky lg:top-[88px]" id="sidebar">
            <SnippetsSection snippets={snippets} />
            <div className="mt-4">
              <RecentVisitors visitors={visitors} />
            </div>
            <TagsCloud tags={tags} />
          </aside>
        </div>
      </div>
    </>
  );
}
