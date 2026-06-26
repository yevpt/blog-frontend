"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { Button, Pagination } from "@repo/ui";
import type { ArticleListItemResp, ArticlePageResp, CategoryTabItem } from "@repo/api";
import { ArticleListHeader } from "./article-list-header";
import { PageSectionHeader } from "@/components/common/page-section-header";
import { ArticleCard } from "./article-card";
import { ArticleCardSkeleton } from "./article-card-skeleton";
import { CommentModal } from "@/components/comments";
import { MomentEndReached, MomentScrollLoader } from "@/components/moments/moment-scroll-loader";
import { useSession } from "@/app/providers/session-provider";
import { ALL_CATEGORY_ID, useArticleList } from "@/hooks/use-article-list";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  filterVisibleCategories,
  getCategoryArticleCount,
  shouldUseCategoryPagination,
} from "@/lib/category-tabs";

/** 与 ArticleSection 侧栏 `lg:grid-cols` 对齐：窄屏文章与碎言纵向堆叠 */
const DESKTOP_LAYOUT_MEDIA_QUERY = "(min-width: 1024px)";

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
    articles,
    pageData,
    isLoadingInitial,
    isLoadingMore,
    endReached,
    fetchError,
    pendingLikeIds,
    changeCategory,
    changePage,
    loadMore,
    toggleLike,
    refreshForSessionChange,
    setArticles,
  } = useArticleList({ initialPage, controlledCategoryId });

  // TODO: 待后端支持文字搜索接口后，在 fetchPage 中加入 search 参数
  const [searchQuery, setSearchQuery] = useState("");
  const [activeComment, setActiveComment] = useState<ActiveComment | null>(null);
  const { userId } = useSession();

  const visibleCategories = useMemo(() => filterVisibleCategories(categories), [categories]);
  const allCategories = useMemo(
    () => [{ ...ALL_CATEGORY, article_count: initialPage.total }, ...visibleCategories],
    [initialPage.total, visibleCategories],
  );
  const currentArticleCount = useMemo(
    () =>
      getCategoryArticleCount(
        currentCategoryId,
        visibleCategories,
        pageData.total || initialPage.total,
      ),
    [currentCategoryId, initialPage.total, pageData.total, visibleCategories],
  );
  const usePagination = shouldUseCategoryPagination(currentArticleCount);
  const isDesktopLayout = useMediaQuery(DESKTOP_LAYOUT_MEDIA_QUERY);
  const useScrollLoad = !usePagination;

  const sectionRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  const prevUserIdRef = useRef<number | null>(userId);
  const wasLoadingInitialRef = useRef(false);
  const pendingPaginationScrollRef = useRef(false);
  loadMoreRef.current = loadMore;

  const hasMoreScrollContent = useScrollLoad && !endReached && !isLoadingInitial && !fetchError;
  const showSentinel = hasMoreScrollContent && !isLoadingMore && isDesktopLayout;
  const showLoadMoreButton = hasMoreScrollContent && !isDesktopLayout;

  const handlePageChange = useCallback(
    (page: number) => {
      pendingPaginationScrollRef.current = true;
      void changePage(page);
    },
    [changePage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !showSentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showSentinel]);

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      return;
    }
    prevUserIdRef.current = userId;
    void refreshForSessionChange();
  }, [refreshForSessionChange, userId]);

  // 分页切换加载完成后，平滑滚动到文章区顶部（scroll-mt-20 已预留顶栏偏移）
  useEffect(() => {
    if (wasLoadingInitialRef.current && !isLoadingInitial && pendingPaginationScrollRef.current) {
      pendingPaginationScrollRef.current = false;
      sectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
    wasLoadingInitialRef.current = isLoadingInitial;
  }, [isLoadingInitial]);

  const skeletonCount = articles.length || pageData.list.length || 6;

  const handleCommentAdded = useCallback(() => {
    if (!activeComment) return;
    setArticles((current) =>
      current.map((item) =>
        item.id === activeComment.articleId
          ? { ...item, comment_count: item.comment_count + 1 }
          : item,
      ),
    );
  }, [activeComment, setArticles]);

  const openComment = (article: ArticleListItemResp) => {
    setActiveComment({
      articleId: article.id,
      title: article.title,
      type: article.category?.name ?? "文章",
    });
  };

  const articleGrid = (
    <>
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] md:gap-5">
        {isLoadingInitial
          ? Array.from({ length: skeletonCount }, (_, i) => <ArticleCardSkeleton key={i} />)
          : articles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                priority={index === 0}
                onLike={toggleLike}
                likeDisabled={pendingLikeIds.has(article.id)}
                onComment={openComment}
              />
            ))}
        {showLoadMoreButton && (
          <div className="col-span-full flex w-full justify-center py-6">
            <Button
              variant="outline"
              size="sm"
              isLoading={isLoadingMore}
              loadingText="加载中..."
              onPress={() => void loadMore()}
              className="h-9 min-w-[7.5rem] rounded-full px-5 text-xs font-semibold text-(--fg2) hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              加载更多
            </Button>
          </div>
        )}
      </div>

      {isLoadingMore && useScrollLoad && isDesktopLayout && <MomentScrollLoader />}
      {endReached && useScrollLoad && !isLoadingMore && !isLoadingInitial && <MomentEndReached />}

      {showSentinel && <div ref={sentinelRef} className="h-px" />}

      {usePagination && pageData.pages > 1 && !isLoadingInitial && (
        <Pagination
          currentPage={currentPage}
          totalPages={pageData.pages}
          onPageChange={handlePageChange}
          className="mt-8"
        />
      )}

      {fetchError && !isLoadingMore && !isLoadingInitial && (
        <p className="mt-4 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
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
