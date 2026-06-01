"use client";

import { useState, useMemo, useEffect } from "react";
import { Pagination } from "@repo/ui";
import type { ArticleListItemResp, CategoryTabItem } from "@repo/api";
import type { Article } from "../../app/_mock/types";
import { fetchMockArticles, MOCK_ARTICLE_PAGE_SIZE } from "../../app/_mock/generate-articles";
import { ArticleListHeader } from "./article-list-header";
import { ArticleCard } from "./article-card";

interface ArticleSectionProps {
  articles: Article[];
}

// 所有分类（含"全部"虚拟分类，id=0）
const CATEGORIES: CategoryTabItem[] = [
  { id: 0, name: "全部", seq: -1, article_count: 0 },
  { id: 1, name: "编程", seq: 0, article_count: 0 },
  { id: 2, name: "工具", seq: 1, article_count: 0 },
  { id: 3, name: "文学", seq: 2, article_count: 0 },
];

// id → name 映射，供过滤使用
const CATEGORY_NAME_MAP: Record<number, string> = {
  0: "全部",
  1: "编程",
  2: "工具",
  3: "文学",
};

// 文章列表区块：含分类 Tabs、搜索框、文章网格和分页
export function ArticleSection({ articles }: ArticleSectionProps) {
  const [currentCategoryId, setCurrentCategoryId] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // category 或 search 变化时重置分页到第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [currentCategoryId, searchQuery]);

  // 模拟后端分页：过滤 + slice
  const pageResult = useMemo(
    () =>
      fetchMockArticles(articles, {
        page: currentPage,
        pageSize: MOCK_ARTICLE_PAGE_SIZE,
        category: CATEGORY_NAME_MAP[currentCategoryId] ?? "全部",
        search: searchQuery,
      }),
    [articles, currentPage, currentCategoryId, searchQuery],
  );

  return (
    <section>
      <ArticleListHeader
        categories={CATEGORIES}
        currentCategoryId={currentCategoryId}
        onCategoryChange={setCurrentCategoryId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 文章网格：移动端单列，md 以上双列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {pageResult.items.map((article) => (
          // TODO(Task 7): ArticleSection 将迁移到 ArticleListItemResp，此处暂时类型断言
          <ArticleCard key={article.id} article={article as unknown as ArticleListItemResp} />
        ))}
      </div>

      {/* 分页：总页数 > 1 时显示 */}
      {pageResult.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pageResult.totalPages}
          onPageChange={setCurrentPage}
          className="mt-8"
        />
      )}
    </section>
  );
}
