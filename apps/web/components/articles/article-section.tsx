"use client";

import { useState, useMemo, useEffect } from "react";
import { Pagination } from "@repo/ui";
import type { Article } from "../../app/_mock/types";
import { fetchMockArticles, MOCK_ARTICLE_PAGE_SIZE } from "../../app/_mock/generate-articles";
import { ArticleListHeader } from "./article-list-header";
import { ArticleCard } from "./article-card";

interface ArticleSectionProps {
  articles: Article[];
}

// 所有分类（含"全部"）
const CATEGORIES = ["全部", "编程", "工具", "文学"];

// 文章列表区块：含分类 Tabs、搜索框、文章网格和分页
export function ArticleSection({ articles }: ArticleSectionProps) {
  const [currentCategory, setCurrentCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // category 或 search 变化时重置分页到第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [currentCategory, searchQuery]);

  // 模拟后端分页：过滤 + slice
  const pageResult = useMemo(
    () =>
      fetchMockArticles(articles, {
        page: currentPage,
        pageSize: MOCK_ARTICLE_PAGE_SIZE,
        category: currentCategory,
        search: searchQuery,
      }),
    [articles, currentPage, currentCategory, searchQuery],
  );

  return (
    <section>
      <ArticleListHeader
        categories={CATEGORIES}
        currentCategory={currentCategory}
        onCategoryChange={setCurrentCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 文章网格：移动端单列，md 以上双列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {pageResult.items.map((article) => (
          <ArticleCard key={article.id} article={article} />
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
