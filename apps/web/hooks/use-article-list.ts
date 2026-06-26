"use client";

import { useCallback, useRef, useState } from "react";
import type { ArticleLikeResp, ArticleListItemResp, ArticlePageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";

export const ALL_CATEGORY_ID = 0;

export interface UseArticleListOptions {
  initialPage: ArticlePageResp;
  /** 受控分类 ID；传入时 hook 不维护内部分类状态 */
  controlledCategoryId?: number;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export function useArticleList({ initialPage, controlledCategoryId }: UseArticleListOptions) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const isControlled = controlledCategoryId !== undefined;
  const [internalCategoryId, setInternalCategoryId] = useState(ALL_CATEGORY_ID);
  const currentCategoryId = isControlled ? controlledCategoryId : internalCategoryId;

  const [currentPage, setCurrentPage] = useState(initialPage.page || 1);
  const [pageData, setPageData] = useState(initialPage);
  const [articles, setArticles] = useState(initialPage.list);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState((initialPage.page || 1) >= initialPage.pages);
  const [fetchError, setFetchError] = useState(false);
  const [pendingLikeIds, setPendingLikeIds] = useState<ReadonlySet<number>>(() => new Set());

  const abortRef = useRef<AbortController | null>(null);
  const categoryRef = useRef(currentCategoryId);
  categoryRef.current = currentCategoryId;
  const pendingLikeIdsRef = useRef(pendingLikeIds);
  pendingLikeIdsRef.current = pendingLikeIds;

  const fetchPage = useCallback(async (categoryId: number, page: number, signal?: AbortSignal) => {
    const qs = buildQuery({
      page,
      ...(categoryId !== ALL_CATEGORY_ID ? { category_id: categoryId } : {}),
    });
    return apiJson<ArticlePageResp>(`/api/articles?${qs}`, { signal });
  }, []);

  const applyFirstPage = useCallback((data: ArticlePageResp) => {
    setArticles(data.list);
    setPageData(data);
    setCurrentPage(data.page || 1);
    setEndReached((data.page || 1) >= data.pages);
  }, []);

  const reloadFirstPage = useCallback(
    async (categoryId: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoadingInitial(true);
      setFetchError(false);
      setEndReached(false);

      try {
        const data = await fetchPage(categoryId, 1, controller.signal);
        if (controller.signal.aborted) return;
        applyFirstPage(data);
        setFetchError(false);
      } catch (err) {
        if (isAbortError(err)) return;
        setFetchError(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingInitial(false);
        }
      }
    },
    [applyFirstPage, fetchPage],
  );

  const changeCategory = useCallback(
    (id: number) => {
      if (!isControlled) {
        setInternalCategoryId(id);
      }
      setCurrentPage(1);
      void reloadFirstPage(id);
    },
    [isControlled, reloadFirstPage],
  );

  const changePage = useCallback(
    async (page: number) => {
      const categoryId = currentCategoryId;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoadingInitial(true);
      setFetchError(false);
      setEndReached(false);

      try {
        const data = await fetchPage(categoryId, page, controller.signal);
        if (controller.signal.aborted) return;
        if (categoryRef.current !== categoryId) return;
        applyFirstPage(data);
        setFetchError(false);
      } catch (err) {
        if (isAbortError(err)) return;
        if (categoryRef.current === categoryId) {
          setFetchError(true);
        }
      } finally {
        if (!controller.signal.aborted && categoryRef.current === categoryId) {
          setIsLoadingInitial(false);
        }
      }
    },
    [applyFirstPage, currentCategoryId, fetchPage],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoadingInitial || endReached) {
      return;
    }
    if (currentPage >= pageData.pages) {
      setEndReached(true);
      return;
    }

    const categoryId = currentCategoryId;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    setFetchError(false);

    try {
      const data = await fetchPage(categoryId, nextPage);
      if (categoryRef.current !== categoryId) {
        return;
      }
      setArticles((prev) => [...prev, ...data.list]);
      setPageData(data);
      setCurrentPage(nextPage);
      if (nextPage >= data.pages) {
        setEndReached(true);
      }
    } catch {
      if (categoryRef.current === categoryId) {
        setFetchError(true);
      }
    } finally {
      if (categoryRef.current === categoryId) {
        setIsLoadingMore(false);
      }
    }
  }, [
    currentCategoryId,
    currentPage,
    endReached,
    fetchPage,
    isLoadingInitial,
    isLoadingMore,
    pageData.pages,
  ]);

  const refreshForSessionChange = useCallback(async () => {
    setFetchError(false);
    try {
      const data = await fetchPage(currentCategoryId, 1);
      applyFirstPage(data);
    } catch {
      // 静默失败，避免登录态切换打断阅读
    }
  }, [applyFirstPage, currentCategoryId, fetchPage]);

  const toggleLike = useCallback(
    async (article: ArticleListItemResp) => {
      if (userId == null) {
        openLoginModal();
        return;
      }
      if (pendingLikeIdsRef.current.has(article.id)) {
        return;
      }

      setPendingLikeIds((current) => new Set([...current, article.id]));
      try {
        const data = await apiJson<ArticleLikeResp>(`/api/articles/${article.id}/like`, {
          method: "POST",
        });
        setArticles((current) =>
          current.map((item) =>
            item.id === article.id
              ? { ...item, is_liked: data.is_liked, like_count: data.like_count }
              : item,
          ),
        );
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(
          getApiErrorMessage(
            err,
            article.is_liked ? "取消点赞失败，请稍后重试" : "点赞失败，请稍后重试",
          ),
          "error",
        );
      } finally {
        setPendingLikeIds((current) => {
          const next = new Set(current);
          next.delete(article.id);
          return next;
        });
      }
    },
    [openLoginModal, userId],
  );

  return {
    currentCategoryId,
    currentPage,
    pageData,
    articles,
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
  };
}
