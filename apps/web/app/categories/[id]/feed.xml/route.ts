import type { NextRequest } from "next/server";
import { createPublicFeedApiClient, buildArticleRssItems } from "@/lib/feed-articles";
import { getCanonicalUrl, getSiteUrl } from "@/lib/seo";
import { buildRssFeed } from "@/lib/rss";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_TITLE = "Yevpt's Blog";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 查询分类名；查不到返回 null（route 返回 404） */
async function fetchCategoryName(id: number): Promise<string | null> {
  const api = createPublicFeedApiClient();
  try {
    const tabs = await api.categories.listTabs();
    return tabs.list.find((c) => c.id === id)?.name ?? null;
  } catch {
    return null;
  }
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  const { id: rawId } = await context.params;
  const categoryId = Number(rawId);

  // 非法 id 直接 404，避免无谓回源
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return new Response("Not Found", { status: 404 });
  }

  const categoryName = await fetchCategoryName(categoryId);
  if (!categoryName) {
    return new Response("Not Found", { status: 404 });
  }

  const items = await buildArticleRssItems(categoryId).catch(() => []);
  const selfUrl = getCanonicalUrl(`/categories/${categoryId}/feed.xml`).toString();
  const xml = buildRssFeed({
    title: `${categoryName} - ${SITE_TITLE}`,
    description: `${SITE_TITLE} 「${categoryName}」分类下的文章`,
    link: getSiteUrl(),
    selfLink: selfUrl,
    items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
