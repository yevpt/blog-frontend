import { buildRssFeed } from "@/lib/rss";
import { buildArticleRssItems } from "@/lib/feed-articles";
import { getCanonicalUrl, getSiteUrl } from "@/lib/seo";

// 与 sitemap 一致：强制动态生成，避免缓存空列表
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_TITLE = "Yevpt's Blog";
const SITE_DESCRIPTION = "分享编程、工具、文学的个人博客";

export async function GET(): Promise<Response> {
  const items = await buildArticleRssItems().catch(() => []);
  const selfUrl = getCanonicalUrl("/feed.xml").toString();
  const xml = buildRssFeed({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    link: getSiteUrl(),
    selfLink: selfUrl,
    items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // 公开 feed 可被任意 CDN/浏览器缓存；失败时也不长久缓存（回源动态生成）
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
