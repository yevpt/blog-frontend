import type { MetadataRoute } from "next";
import { createApiClient, type ArticleListItemResp } from "@repo/api";
import { getCanonicalUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ARTICLE_PAGE_SIZE = 50;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/moments", changeFrequency: "daily", priority: 0.7 },
  { path: "/guestbook", changeFrequency: "weekly", priority: 0.5 },
  { path: "/friend-links", changeFrequency: "monthly", priority: 0.4 },
  { path: "/circle", changeFrequency: "weekly", priority: 0.4 },
];

async function fetchPublicArticles(): Promise<ArticleListItemResp[]> {
  try {
    return await fetchPublicArticlesFromPublicApi();
  } catch {
    try {
      return await fetchPublicArticlesFromBackend();
    } catch {
      return [];
    }
  }
}

function getPublicApiBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production"
    ? getCanonicalUrl("/").origin
    : "http://localhost:3000";
}

async function fetchPublicArticlesFromBackend(): Promise<ArticleListItemResp[]> {
  const api = createApiClient({
    baseUrl: process.env.API_BASE_URL!,
    getAccessToken: () => null,
  });

  const loadPage = (page: number) =>
    api.articles.listPublic({
      page,
      page_size: ARTICLE_PAGE_SIZE,
      sort_by: "updated_at",
      sort_order: "desc",
    });

  return collectArticlePages(loadPage);
}

async function fetchPublicArticlesFromPublicApi(): Promise<ArticleListItemResp[]> {
  const loadPage = async (page: number) => {
    const url = new URL("/api/articles", `${getPublicApiBaseUrl()}/`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(ARTICLE_PAGE_SIZE));
    url.searchParams.set("sort_by", "updated_at");
    url.searchParams.set("sort_order", "desc");

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) throw new Error("Failed to fetch articles from public API");
    return (await res.json()) as { pages: number; list: ArticleListItemResp[] };
  };

  return collectArticlePages(loadPage);
}

async function collectArticlePages(
  loadPage: (page: number) => Promise<{ pages: number; list: ArticleListItemResp[] }>,
): Promise<ArticleListItemResp[]> {
  const firstPage = await loadPage(1);

  if (firstPage.pages <= 1) return firstPage.list;

  const restPages = await Promise.all(
    Array.from({ length: firstPage.pages - 1 }, (_, index) => loadPage(index + 2)),
  );

  return firstPage.list.concat(restPages.flatMap((page) => page.list));
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
