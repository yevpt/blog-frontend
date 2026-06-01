"use client";

import { useState, useMemo, useCallback } from "react";
import { Pagination } from "@repo/ui";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import { ArticleListHeader } from "./article-list-header";
import { ArticleCard } from "./article-card";

const ALL_CATEGORY_ID = 0;

// 虚拟"全部"Tab，对应不带 category_id 的请求
const ALL_CATEGORY: CategoryTabItem = {
  id: ALL_CATEGORY_ID,
  name: "全部",
  seq: -1,
  article_count: 0,
};

interface ArticleSectionProps {
  initialPage: ArticlePageResp;
  categories: CategoryTabItem[];
}

export function ArticleSection({ initialPage, categories }: ArticleSectionProps) {
  const [currentCategoryId, setCurrentCategoryId] = useState(ALL_CATEGORY_ID);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allCategories = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  const fetchPage = useCallback(async (categoryId: number, page: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (categoryId !== ALL_CATEGORY_ID) params.set("category_id", String(categoryId));
      const res = await fetch(`/api/articles?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: ArticlePageResp = await res.json();
      setPageData(data);
    } catch {
      // 保留已有数据，不显示错误
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCategoryChange = useCallback(
    (id: number) => {
      setCurrentCategoryId(id);
      setCurrentPage(1);
      void fetchPage(id, 1);
    },
    [fetchPage],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      void fetchPage(currentCategoryId, page);
    },
    [currentCategoryId, fetchPage],
  );

  return (
    <section>
      <ArticleListHeader
        categories={allCategories}
        currentCategoryId={currentCategoryId}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 换页/换分类时淡出，保留已有数据防止布局抖动 */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 transition-opacity duration-200 ${
          isLoading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {pageData.list.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {pageData.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pageData.pages}
          onPageChange={handlePageChange}
          className="mt-8"
        />
      )}
    </section>
  );
}
