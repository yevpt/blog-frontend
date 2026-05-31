import { describe, it, expect } from "vitest";

import { generateMockArticles, fetchMockArticles, MOCK_ARTICLE_COUNT } from "./generate-articles";

describe("generateMockArticles", () => {
  it("默认生成 192 篇文章", () => {
    const articles = generateMockArticles();
    expect(articles).toHaveLength(MOCK_ARTICLE_COUNT);
  });

  it("文章 id 与 href 唯一", () => {
    const articles = generateMockArticles(10);
    const ids = new Set(articles.map((a) => a.id));
    expect(ids.size).toBe(10);
  });
});

describe("fetchMockArticles", () => {
  const allArticles = generateMockArticles(24);

  it("返回第一页 6 条数据", () => {
    const result = fetchMockArticles(allArticles, { page: 1, pageSize: 6 });
    expect(result.items).toHaveLength(6);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(4);
    expect(result.total).toBe(24);
  });

  it("超出页码时 clamp 到最后一页", () => {
    const result = fetchMockArticles(allArticles, { page: 99, pageSize: 6 });
    expect(result.page).toBe(4);
    expect(result.items).toHaveLength(6);
  });

  it("按分类过滤后再分页", () => {
    const result = fetchMockArticles(allArticles, { page: 1, pageSize: 6, category: "编程" });
    expect(result.items.every((a) => a.category === "编程")).toBe(true);
    expect(result.total).toBe(8);
  });

  it("按搜索关键词过滤", () => {
    const result = fetchMockArticles(allArticles, { page: 1, pageSize: 6, search: "第 1 篇" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toContain("第 1 篇");
  });

  it("无匹配结果时仍返回合法分页元信息", () => {
    const result = fetchMockArticles(allArticles, {
      page: 1,
      pageSize: 6,
      search: "不存在的关键词xyz",
    });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });
});
