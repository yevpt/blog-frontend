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

/** 查询标签名；查不到返回 null（route 返回 404） */
async function fetchTagName(id: number): Promise<string | null> {
  const api = createPublicFeedApiClient();
  try {
    const tags = await api.tags.list();
    return tags.list.find((t) => t.id === id)?.name ?? null;
  } catch {
    return null;
  }
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  const { id: rawId } = await context.params;
  const tagId = Number(rawId);

  // 非法 id 直接 404，避免无谓回源
  if (!Number.isInteger(tagId) || tagId <= 0) {
    return new Response("Not Found", { status: 404 });
  }

  const tagName = await fetchTagName(tagId);
  if (!tagName) {
    return new Response("Not Found", { status: 404 });
  }

  const items = await buildArticleRssItems({ tagId }).catch(() => []);
  const selfUrl = getCanonicalUrl(`/tags/${tagId}/feed.xml`).toString();
  const xml = buildRssFeed({
    title: `#${tagName} - ${SITE_TITLE}`,
    description: `${SITE_TITLE} 「${tagName}」标签下的文章`,
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
