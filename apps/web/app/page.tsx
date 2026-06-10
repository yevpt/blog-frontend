import type { Metadata } from "next";
import { visitors } from "./_mock/visitors";
import { tags } from "./_mock/tags";
import type {
  ArticleListItemResp,
  ArticlePageResp,
  CategoryTabsResp,
  MomentPageResp,
} from "@repo/api";
import type { FeaturedPost } from "./_mock/types";
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
const EMPTY_RECOMMENDED_PAGE: ArticlePageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 5,
  list: [],
};
const EMPTY_CATEGORIES: CategoryTabsResp = { list: [] };
const EMPTY_MOMENTS: MomentPageResp = { total: 0, pages: 0, page: 1, page_size: 3, list: [] };

function toFeaturedPost(article: ArticleListItemResp): FeaturedPost | null {
  if (!article.cover_img_url) return null;

  return {
    id: String(article.id),
    title: article.title,
    excerpt: article.short_content ?? "",
    coverImage: article.cover_img_url,
    category: article.category?.name ?? "未分类",
    date: article.created_at,
    href: `/articles/${article.id}`,
  };
}

export default async function Home() {
  const api = await createServerApiClient();
  const [categoriesResp, initialPage, recommendedPage, momentsPage] = await Promise.all([
    api.categories.listTabs().catch(() => EMPTY_CATEGORIES),
    api.articles.listPublic({ page: 1 }).catch(() => EMPTY_PAGE),
    api.articles
      .listPublic({ page: 1, page_size: 5, recommend: true })
      .catch(() => EMPTY_RECOMMENDED_PAGE),
    api.moments
      .listPublic({ page: 1, page_size: 3, user_id: Number(process.env.BLOG_USER_ID) })
      .catch(() => EMPTY_MOMENTS),
  ]);
  const recommendedPosts = recommendedPage.list
    .map(toFeaturedPost)
    .filter((post): post is FeaturedPost => post !== null);

  return (
    <>
      <FeaturedCarousel posts={recommendedPosts} />

      <div data-testid="home-page-body" className="mx-auto max-w-[1120px] px-5 py-9 pb-20">
        <ArticleSection
          initialPage={initialPage}
          categories={categoriesResp.list}
          sidebar={
            <>
              <SnippetsSection snippets={momentsPage.list} />
              <RecentVisitors visitors={visitors} />
              <TagsCloud tags={tags} />
            </>
          }
        />
      </div>
    </>
  );
}
