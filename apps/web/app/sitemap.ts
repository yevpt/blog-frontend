import type { MetadataRoute } from "next";
import { createApiClient, type ArticleListItemResp } from "@repo/api";
import { getCanonicalUrl } from "@/lib/seo";

export const revalidate = 3600;

const ARTICLE_PAGE_SIZE = 100;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/snippets", changeFrequency: "daily", priority: 0.7 },
  { path: "/guestbook", changeFrequency: "weekly", priority: 0.5 },
  { path: "/friend-links", changeFrequency: "monthly", priority: 0.4 },
  { path: "/circle", changeFrequency: "weekly", priority: 0.4 },
];

async function fetchPublicArticles(): Promise<ArticleListItemResp[]> {
  const api = createApiClient({
    baseUrl: process.env.API_BASE_URL!,
    getAccessToken: () => null,
  });

  try {
    const firstPage = await api.articles.listPublic({
      page: 1,
      page_size: ARTICLE_PAGE_SIZE,
      sort_by: "updated_at",
      sort_order: "desc",
    });

    if (firstPage.pages <= 1) return firstPage.list;

    const restPages = await Promise.all(
      Array.from({ length: firstPage.pages - 1 }, (_, index) =>
        api.articles.listPublic({
          page: index + 2,
          page_size: ARTICLE_PAGE_SIZE,
          sort_by: "updated_at",
          sort_order: "desc",
        }),
      ),
    );

    return firstPage.list.concat(restPages.flatMap((page) => page.list));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const articles = await fetchPublicArticles();

  return STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: getCanonicalUrl(path).toString(),
    lastModified: now,
    changeFrequency,
    priority,
  })).concat(
    articles.map((article) => ({
      url: getCanonicalUrl(`/articles/${article.id}`).toString(),
      lastModified: new Date(article.updated_at || article.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );
}
