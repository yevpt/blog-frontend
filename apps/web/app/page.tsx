import type { Metadata } from "next";
import { featuredPosts } from "./_mock/featured-posts";
import { articles } from "./_mock/articles";
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

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 全宽推荐轮播 */}
      <FeaturedCarousel posts={featuredPosts} />

      {/* 双栏区域：主内容 + 右侧栏 */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* 主内容区 */}
        <div className="min-w-0 space-y-12">
          <ArticleSection articles={articles} />
          <SnippetsSection snippets={snippets} />
        </div>

        {/* 右侧栏（移动端排在后面，PC 端固定在右侧）*/}
        <aside className="lg:sticky lg:top-20 space-y-0">
          <RecentVisitors visitors={visitors} />
          <TagsCloud tags={tags} />
        </aside>
      </div>
    </main>
  );
}
