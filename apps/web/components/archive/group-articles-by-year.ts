import type { ArticleListItemResp } from "@repo/api";
import { getDisplayYear } from "@/lib/format-time";

export interface ArchiveYearGroup {
  year: number;
  articles: ArticleListItemResp[];
}

/**
 * 按发布时间（展示时区）把文章分桶到年份。
 * 返回年份降序的分组；年内文章保持输入顺序（调用方按 created_at desc 传入即可）。
 */
export function groupArticlesByYear(articles: ArticleListItemResp[]): ArchiveYearGroup[] {
  const buckets = new Map<number, ArticleListItemResp[]>();

  for (const article of articles) {
    const year = getDisplayYear(article.created_at);
    const bucket = buckets.get(year);
    if (bucket) {
      bucket.push(article);
    } else {
      buckets.set(year, [article]);
    }
  }

  return [...buckets.entries()]
    .map(([year, list]) => ({ year, articles: list }))
    .sort((a, b) => b.year - a.year);
}
