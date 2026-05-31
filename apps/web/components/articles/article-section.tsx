"use client";

import { useState, useMemo, useEffect } from "react";
import { Pagination } from "@repo/ui";
import type { Article } from "../../app/_mock/types";
import { ArticleListHeader } from "./article-list-header";
import { ArticleCard } from "./article-card";

interface ArticleSectionProps {
  articles: Article[];
}

// 每页显示的文章数
const ARTICLES_PER_PAGE = 6;

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

  // 1. 按分类过滤（'全部' 不过滤）
  // 2. 再按搜索关键词过滤（匹配标题和摘要，忽略大小写）
  const filteredArticles = useMemo(() => {
    let result = articles;

    if (currentCategory !== "全部") {
      result = result.filter((article) => article.category === currentCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query),
      );
    }

    return result;
  }, [articles, currentCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));

  // 根据当前页截取要显示的文章
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    return filteredArticles.slice(start, start + ARTICLES_PER_PAGE);
  }, [filteredArticles, currentPage]);

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
        {paginatedArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="mt-8"
        />
      )}
    </section>
  );
}
