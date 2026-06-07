"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { Pagination } from "@repo/ui";
import type {
  ArticleLikeResp,
  ArticleListItemResp,
  ArticlePageResp,
  CategoryTabItem,
} from "@repo/api";
import { ArticleListHeader } from "./article-list-header";
import { ArticleCard } from "./article-card";
import { ArticleCardSkeleton } from "./article-card-skeleton";
import { CommentModal } from "@/components/comments";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";

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
  const [internalCategoryId, setInternalCategoryId] = useState(ALL_CATEGORY_ID);
  const isControlled = controlledCategoryId !== undefined;
  const currentCategoryId = isControlled ? controlledCategoryId : internalCategoryId;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  // TODO: 待后端支持文字搜索接口后，在 fetchPage 中加入 search 参数
  const [searchQuery, setSearchQuery] = useState("");
  const [activeComment, setActiveComment] = useState<ActiveComment | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<number[]>([]);
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const allCategories = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  const abortRef = useRef<AbortController | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const prevUserIdRef = useRef<number | null>(userId);
  const silentRefreshRef = useRef(false);
  // 记录上一次的 isLoading 值，用于检测加载完成时机
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

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      return;
    }
    prevUserIdRef.current = userId;
    silentRefreshRef.current = true;
    setFetchError(false);
    void fetchPage(currentCategoryId, currentPage);
  }, [currentCategoryId, currentPage, fetchPage, userId]);

  const handleCategoryChange = useCallback(
    (id: number) => {
      setFetchError(false);
      setInternalCategoryId(id);
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
  }, [activeComment]);

  const openComment = (article: ArticleListItemResp) => {
    setActiveComment({
      articleId: article.id,
      title: article.title,
      type: article.category?.name ?? "文章",
    });
  };

  const handleLike = useCallback(
    async (article: ArticleListItemResp) => {
      if (userId == null) {
        openLoginModal();
        return;
      }
      if (pendingLikeIds.includes(article.id)) {
        return;
      }

      setPendingLikeIds((current) => [...current, article.id]);
      try {
        const res = await fetch(`/api/articles/${article.id}/like`, { method: "POST" });
        if (res.status === 401) {
          openLoginModal();
          return;
        }
        if (!res.ok) {
          throw new Error("failed");
        }

        const data: ArticleLikeResp = await res.json();
        setPageData((current) => ({
          ...current,
          list: current.list.map((item) =>
            item.id === article.id
              ? { ...item, is_liked: data.is_liked, like_count: data.like_count }
              : item,
          ),
        }));
      } catch {
        addToast(article.is_liked ? "取消点赞失败，请稍后重试" : "点赞失败，请稍后重试", "error");
      } finally {
        setPendingLikeIds((current) => current.filter((id) => id !== article.id));
      }
    },
    [openLoginModal, pendingLikeIds, userId],
  );

  const articleGrid = (
    <>
      <div className="mt-6 grid grid-cols-1 gap-0 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] md:gap-5">
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, i) => <ArticleCardSkeleton key={i} />)
          : pageData.list.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onLike={handleLike}
                likeDisabled={pendingLikeIds.includes(article.id)}
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
          onPageChange={handlePageChange}
          className="mt-8"
        />
      )}
    </>
  );

  return (
    <section id="articles" ref={sectionRef} className="scroll-mt-20">
      <div data-testid="home-articles-header" className="mb-6">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
          最新文章
        </p>
        <h2 className="mb-5 text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
          近期在写什么
        </h2>
        <ArticleListHeader
          categories={allCategories}
          currentCategoryId={currentCategoryId}
          onCategoryChange={handleCategoryChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {sidebar ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
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
