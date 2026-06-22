"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { Pagination } from "@repo/ui";
import type { ArticleListItemResp, ArticlePageResp, CategoryTabItem } from "@repo/api";
import { ArticleListHeader } from "./article-list-header";
import { PageSectionHeader } from "@/components/common/page-section-header";
import { ArticleCard } from "./article-card";
import { ArticleCardSkeleton } from "./article-card-skeleton";
import { CommentModal } from "@/components/comments";
import { useSession } from "@/app/providers/session-provider";
import { ALL_CATEGORY_ID, useArticleList } from "@/hooks/use-article-list";

// 虚拟"全部"Tab，对应不带 category_id 的请求
const ALL_CATEGORY: CategoryTabItem = {
  id: ALL_CATEGORY_ID,
  name: "全部",
  seq: -1,
  article_count: 0,
};

interface ArticleSectionProps {
  initialPage: ArticlePageResp;
  categories?: CategoryTabItem[];
  sidebar?: ReactNode;
  /** 受控模式：由父组件控制当前分类，不渲染内部 Tabs */
  currentCategoryId?: number;
}

interface ActiveComment {
  articleId: number;
  title: string;
  type: string;
}

export function ArticleSection({
  initialPage,
  categories = [],
  sidebar,
  currentCategoryId: controlledCategoryId,
}: ArticleSectionProps) {
  const {
    currentCategoryId,
    currentPage,
    pageData,
    isLoading,
    fetchError,
    pendingLikeIds,
    changeCategory,
    changePage,
    toggleLike,
    refreshForSessionChange,
    setPageData,
  } = useArticleList({ initialPage, controlledCategoryId });

  // TODO: 待后端支持文字搜索接口后，在 fetchPage 中加入 search 参数
  const [searchQuery, setSearchQuery] = useState("");
  const [activeComment, setActiveComment] = useState<ActiveComment | null>(null);
  const { userId } = useSession();

  const allCategories = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  const sectionRef = useRef<HTMLElement>(null);
  const prevUserIdRef = useRef<number | null>(userId);
  const silentRefreshRef = useRef(false);
  const wasLoadingRef = useRef(false);

  // 数据加载完成（isLoading true → false）后再滚动，避免布局偏移打断平滑滚动
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      if (silentRefreshRef.current) {
        silentRefreshRef.current = false;
      } else {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      return;
    }
    prevUserIdRef.current = userId;
    silentRefreshRef.current = true;
    void refreshForSessionChange();
  }, [refreshForSessionChange, userId]);

  const skeletonCount = pageData.list.length || 6;

  const handleCommentAdded = useCallback(() => {
    if (!activeComment) return;
    setPageData((current) => ({
      ...current,
      list: current.list.map((item) =>
        item.id === activeComment.articleId
          ? { ...item, comment_count: item.comment_count + 1 }
          : item,
      ),
    }));
  }, [activeComment, setPageData]);

  const openComment = (article: ArticleListItemResp) => {
    setActiveComment({
      articleId: article.id,
      title: article.title,
      type: article.category?.name ?? "文章",
    });
  };

  const articleGrid = (
    <>
      <div className="mt-6 grid grid-cols-1 gap-0 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] md:gap-5">
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, i) => <ArticleCardSkeleton key={i} />)
          : pageData.list.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                priority={index === 0}
                onLike={toggleLike}
                likeDisabled={pendingLikeIds.has(article.id)}
                onComment={openComment}
              />
            ))}
      </div>

      {fetchError && (
        <p className="mt-4 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
      )}

      {pageData.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pageData.pages}
          onPageChange={changePage}
          className="mt-8"
        />
      )}
    </>
  );

  return (
    <section id="articles" ref={sectionRef} className="scroll-mt-20">
      <div data-testid="home-articles-header" className="mb-6">
        <PageSectionHeader label="最新文章" title="近期在写什么" as="h2" titleClassName="mb-5" />
        <ArticleListHeader
          categories={allCategories}
          currentCategoryId={currentCategoryId}
          onCategoryChange={changeCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {sidebar ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_328px]">
          <main className="min-w-0">{articleGrid}</main>
          <aside className="mt-10 flex flex-col gap-3.5 lg:sticky lg:top-[88px] lg:mt-6">
            {sidebar}
          </aside>
        </div>
      ) : (
        articleGrid
      )}

      {activeComment !== null && (
        <CommentModal
          targetType={activeComment.type === "moment" ? "moment" : "article"}
          targetId={activeComment.articleId}
          onClose={() => setActiveComment(null)}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </section>
  );
}
