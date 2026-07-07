import type { MomentItemResp } from "@repo/api";
import { markdownToHtml } from "@repo/markdown/server";
import { getCanonicalUrl } from "@/lib/seo";
import { buildRssFeed, toRfc822Date, type RssItem } from "@/lib/rss";
import { createPublicFeedApiClient } from "@/lib/feed-articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_TITLE = "Yevpt's Blog";
const MOMENT_TITLE_MAX_LENGTH = 30;
const MOMENT_FEED_LIMIT = 30;

/** 碎语标题：截取 content 前 N 字，空内容回退为「碎语」 */
function buildMomentTitle(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "碎语";
  if (trimmed.length < MOMENT_TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, MOMENT_TITLE_MAX_LENGTH)}…`;
}

/** 把碎语图片拼成 HTML 片段（仅展示 original 模式，过滤审核模糊的图） */
function buildMomentImagesHtml(moment: MomentItemResp): string {
  const imgs = moment.images
    .filter((img) => img.display_mode === "original")
    .map((img) => `<img src="${img.access_url}" alt="${img.name ?? ""}" />`);
  return imgs.length > 0 ? `<div class="moment-images">${imgs.join("")}</div>` : "";
}

async function momentToRssItem(moment: MomentItemResp): Promise<RssItem> {
  const link = getCanonicalUrl(`/moments/${moment.id}`).toString();
  const contentHtml = await markdownToHtml(moment.content).catch(() => moment.content);
  const imagesHtml = buildMomentImagesHtml(moment);
  return {
    title: buildMomentTitle(moment.content),
    link,
    pubDate: toRfc822Date(moment.updated_at || moment.created_at),
    description: moment.content,
    contentEncoded: imagesHtml ? `${contentHtml}${imagesHtml}` : contentHtml,
    author: moment.user?.nickname,
  };
}

/** 拉取博主碎语（按 BLOG_USER_ID 过滤），按创建时间倒序 */
async function fetchBloggerMoments(): Promise<MomentItemResp[]> {
  const userId = Number(process.env.BLOG_USER_ID);
  const api = createPublicFeedApiClient();
  const page = await api.moments.listPublic({
    user_id: userId,
    page: 1,
    page_size: MOMENT_FEED_LIMIT,
  });
  return page.list;
}

export async function GET(): Promise<Response> {
  const moments = await fetchBloggerMoments().catch(() => [] as MomentItemResp[]);
  const items = await Promise.all(moments.map(momentToRssItem));
  const selfUrl = getCanonicalUrl("/moments/feed.xml").toString();
  const xml = buildRssFeed({
    title: `${SITE_TITLE} · 碎语`,
    description: "生活、思考与随笔的碎碎念",
    link: getCanonicalUrl("/moments").toString(),
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
