import { describe, it, expect } from "vitest";
import type { ArticleListItemResp } from "@repo/api";
import { groupArticlesByYear } from "./group-articles-by-year";

function makeArticle(id: number, createdAt: string): ArticleListItemResp {
  return {
    id,
    title: `文章 ${id}`,
    user_id: 1,
    status: 1,
    comment_status: 1,
    read_count: 0,
    like_count: 0,
    is_liked: false,
    comment_count: 0,
    is_recommended: false,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe("groupArticlesByYear", () => {
  it("空数组返回空分组", () => {
    expect(groupArticlesByYear([])).toEqual([]);
  });

  it("按年份分桶且年份降序", () => {
    const articles = [
      makeArticle(1, "2023-05-01T00:00:00Z"),
      makeArticle(2, "2024-03-01T00:00:00Z"),
      makeArticle(3, "2022-11-20T00:00:00Z"),
      makeArticle(4, "2024-07-15T00:00:00Z"),
    ];

    const groups = groupArticlesByYear(articles);

    expect(groups.map((g) => g.year)).toEqual([2024, 2023, 2022]);
    expect(groups[0]?.articles.map((a) => a.id)).toEqual([2, 4]);
    expect(groups[1]?.articles.map((a) => a.id)).toEqual([1]);
    expect(groups[2]?.articles.map((a) => a.id)).toEqual([3]);
  });

  it("年内保持输入顺序", () => {
    const articles = [
      makeArticle(1, "2024-08-01T00:00:00Z"),
      makeArticle(2, "2024-02-01T00:00:00Z"),
      makeArticle(3, "2024-05-01T00:00:00Z"),
    ];

    const groups = groupArticlesByYear(articles);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.articles.map((a) => a.id)).toEqual([1, 2, 3]);
  });

  it("跨年边界按展示时区（Asia/Shanghai）归属", () => {
    // UTC 2023-12-31 16:30 对应北京时间 2024-01-01 00:30，应归入 2024 年
    const articles = [makeArticle(1, "2023-12-31T16:30:00Z")];

    const groups = groupArticlesByYear(articles);

    expect(groups.map((g) => g.year)).toEqual([2024]);
  });
});
