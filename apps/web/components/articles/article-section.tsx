"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Pagination } from "@repo/ui";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import { ArticleListHeader } from "./article-list-header";
import { ArticleCard } from "./article-card";
import { ArticleCardSkeleton } from "./article-card-skeleton";

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
  const [fetchError, setFetchError] = useState(false);
  // TODO: 待后端支持文字搜索接口后，在 fetchPage 中加入 search 参数
  const [searchQuery, setSearchQuery] = useState("");

  const allCategories = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  const abortRef = useRef<AbortController | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // 记录上一次的 isLoading 值，用于检测加载完成时机
  const wasLoadingRef = useRef(false);

  // 数据加载完成（isLoading true → false）后再滚动，避免布局偏移打断平滑滚动
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  const fetchPage = useCallback(async (categoryId: number, page: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (categoryId !== ALL_CATEGORY_ID) params.set("category_id", String(categoryId));
      const res = await fetch(`/api/articles?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("fetch failed");
      const data: ArticlePageResp = await res.json();
      setPageData(data);
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setFetchError(true);
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  const handleCategoryChange = useCallback(
    (id: number) => {
      setFetchError(false);
      setCurrentCategoryId(id);
      setCurrentPage(1);
      void fetchPage(id, 1);
    },
    [fetchPage],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setFetchError(false);
      setCurrentPage(page);
      void fetchPage(currentCategoryId, page);
      // 滚动由 useEffect 在 isLoading 变为 false 后触发，布局稳定时再执行
    },
    [currentCategoryId, fetchPage],
  );

  const skeletonCount = pageData.list.length || 6;

  return (
    <section ref={sectionRef} className="scroll-mt-20">
      <ArticleListHeader
        categories={allCategories}
        currentCategoryId={currentCategoryId}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, i) => <ArticleCardSkeleton key={i} />)
          : pageData.list.map((article) => <ArticleCard key={article.id} article={article} />)}
      </div>

      {fetchError && (
        <p className="mt-4 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
      )}

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
