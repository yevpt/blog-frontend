/**
 * 文章 → RSS item 转换的共享逻辑，供主 feed 与分类 feed 复用。
 *
 * 数据来源：
 * - 列表用公开文章接口（匿名，不带用户态，避免破坏 feed 缓存）
 * - 全文需逐条 getDetail（列表项不含 content）
 */
import { createApiClient, type ArticleDetailResp, type ArticleListItemResp } from "@repo/api";
import { markdownToHtml } from "@repo/markdown/server";
import { htmlExcerptToPlainText } from "@repo/markdown";
import { getCanonicalUrl } from "@/lib/seo";
import { toRfc822Date, type RssItem } from "@/lib/rss";

/** feed 中保留的最大文章条数（全文渲染开销大，feed 只需体现最新更新） */
export const FEED_ARTICLE_LIMIT = 20;

/** 创建匿名公开 API 客户端（不带用户 cookie，保证 feed 可缓存） */
export function createPublicFeedApiClient() {
  return createApiClient({
    baseUrl: process.env.API_BASE_URL!,
    getAccessToken: () => null,
  });
}

/** feed 文章过滤选项；categoryId/tagId 均缺省时为全站 */
export interface ArticleFeedOptions {
  categoryId?: number;
  tagId?: number;
  limit?: number;
}

/**
 * 拉取最新 N 篇公开文章（仅列表元数据）。
 * 按 updated_at 倒序，取第一页前 limit 条。
 */
export async function fetchLatestArticleList({
  categoryId,
  tagId,
  limit = FEED_ARTICLE_LIMIT,
}: ArticleFeedOptions = {}): Promise<ArticleListItemResp[]> {
  const api = createPublicFeedApiClient();
  const page = await api.articles.listPublic({
    page: 1,
    page_size: limit,
    sort_by: "updated_at",
    sort_order: "desc",
    category_id: categoryId,
    tag_id: tagId,
  });
  return page.list;
}

/**
 * 并发拉取一批文章的全文详情。任一篇失败则跳过（feed 尽量完整，不因单篇失败整体 500）。
 */
export async function fetchArticleDetails(ids: number[]): Promise<ArticleDetailResp[]> {
  const api = createPublicFeedApiClient();
  const results = await Promise.allSettled(ids.map((id) => api.articles.getDetail(id)));
  return (
    results
      .filter((r): r is PromiseFulfilledResult<ArticleDetailResp> => r.status === "fulfilled")
      .map((r) => r.value)
      // 只保留公开文章（status === 1）；加密/隐藏/草稿不入 feed
      .filter((detail) => detail.status === 1)
  );
}

/**
 * 把一篇文章详情 + 列表元数据转成 RSS item。
 * 全文经 markdown 渲染放 content:encoded，摘要纯文本放 description。
 */
export async function articleToRssItem(detail: ArticleDetailResp): Promise<RssItem> {
  const link = getCanonicalUrl(`/articles/${detail.id}`).toString();
  const contentHtml = await markdownToHtml(detail.content, { stripInvalidImages: true });
  const description = detail.short_content
    ? htmlExcerptToPlainText(detail.short_content)
    : undefined;
  const categories = detail.categories?.map((c) => c.name).filter(Boolean);

  return {
    title: detail.title,
    link,
    pubDate: toRfc822Date(detail.updated_at || detail.created_at),
    description,
    contentEncoded: contentHtml,
    categories,
  };
}

/**
 * 端到端：拉取最新文章并转成 RSS items。
 * 主 feed 与分类/标签 feed 共用；categoryId/tagId 缺省时为全站。
 */
export async function buildArticleRssItems(options: ArticleFeedOptions = {}): Promise<RssItem[]> {
  const list = await fetchLatestArticleList(options);
  if (list.length === 0) return [];
  const details = await fetchArticleDetails(list.map((a) => a.id));
  // 保持列表的 updated_at 倒序顺序
  const orderMap = new Map(list.map((a, i) => [a.id, i]));
  const sorted = details.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  return Promise.all(sorted.map(articleToRssItem));
}
