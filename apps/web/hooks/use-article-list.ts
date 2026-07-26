"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArticleLikeResp, ArticleListItemResp, ArticlePageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import {
  getArticleListCache,
  getLastArticleListCategoryId,
  setArticleListCache,
  setLastArticleListCategoryId,
  shouldRestoreArticleListCache,
  toArticleListCacheKey,
} from "@/lib/article-list-cache";
import { ALL_CATEGORY_ID } from "@/lib/category-tabs";

// 保持对外导出路径不变（常量定义在 lib/category-tabs，避免 lib 反向依赖 hook）
export { ALL_CATEGORY_ID };

export interface UseArticleListOptions {
  initialPage: ArticlePageResp;
  /** 受控分类 ID；传入时 hook 不维护内部分类状态 */
  controlledCategoryId?: number;
  /** 受控标签 ID；与 controlledCategoryId 互斥，传入时按标签过滤 */
  controlledTagId?: number;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function resolveBootCategoryId(isControlled: boolean, controlledCategoryId?: number): number {
  if (isControlled) {
    return controlledCategoryId ?? ALL_CATEGORY_ID;
  }
  return getLastArticleListCategoryId();
}

function resolveBootListState(
  cacheKey: string,
  initialPage: ArticlePageResp,
): {
  articles: ArticleListItemResp[];
  currentPage: number;
  pageData: ArticlePageResp;
  endReached: boolean;
} {
  const cached = getArticleListCache(cacheKey);
  if (cached && shouldRestoreArticleListCache(cached, initialPage)) {
    return cached;
  }
  return {
    articles: initialPage.list,
    currentPage: initialPage.page || 1,
    pageData: initialPage,
    endReached: (initialPage.page || 1) >= initialPage.pages,
  };
}

export function useArticleList({
  initialPage,
  controlledCategoryId,
  controlledTagId,
}: UseArticleListOptions) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const isControlled = controlledCategoryId !== undefined || controlledTagId !== undefined;
  const bootCategoryId = resolveBootCategoryId(isControlled, controlledCategoryId);
  const bootListState = resolveBootListState(
    toArticleListCacheKey(bootCategoryId, controlledTagId),
    initialPage,
  );

  const [internalCategoryId, setInternalCategoryId] = useState(
    isControlled ? ALL_CATEGORY_ID : bootCategoryId,
  );
  // 受控标签模式下分类恒为「全部」，过滤维度由 tag_id 承担
  const currentCategoryId = isControlled
    ? (controlledCategoryId ?? ALL_CATEGORY_ID)
    : internalCategoryId;

  const [currentPage, setCurrentPage] = useState(bootListState.currentPage);
  const [pageData, setPageData] = useState(bootListState.pageData);
  const [articles, setArticles] = useState(bootListState.articles);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(bootListState.endReached);
  const [fetchError, setFetchError] = useState(false);
  const [pendingLikeIds, setPendingLikeIds] = useState<ReadonlySet<number>>(() => new Set());

  const abortRef = useRef<AbortController | null>(null);
  const categoryRef = useRef(currentCategoryId);
  categoryRef.current = currentCategoryId;
  const pendingLikeIdsRef = useRef(pendingLikeIds);
  pendingLikeIdsRef.current = pendingLikeIds;
  const isLoadingMoreRef = useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;
  const isLoadingInitialRef = useRef(isLoadingInitial);
  isLoadingInitialRef.current = isLoadingInitial;
  const endReachedRef = useRef(endReached);
  endReachedRef.current = endReached;
  const pageDataRef = useRef(pageData);
  pageDataRef.current = pageData;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  useEffect(() => {
    setArticleListCache(toArticleListCacheKey(currentCategoryId, controlledTagId), {
      articles,
      currentPage,
      pageData,
      endReached,
    });
    if (!isControlled) {
      setLastArticleListCategoryId(currentCategoryId);
    }
  }, [
    articles,
    controlledTagId,
    currentCategoryId,
    currentPage,
    endReached,
    isControlled,
    pageData,
  ]);

  const fetchPage = useCallback(
    async (categoryId: number, page: number, signal?: AbortSignal) => {
      const qs = buildQuery({
        page,
        // 受控标签模式走 tag_id，忽略分类维度
        ...(controlledTagId !== undefined
          ? { tag_id: controlledTagId }
          : categoryId !== ALL_CATEGORY_ID
            ? { category_id: categoryId }
            : {}),
      });
      return apiJson<ArticlePageResp>(`/api/articles?${qs}`, { signal });
    },
    [controlledTagId],
  );

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
        setLastArticleListCategoryId(id);
      }

      const cached = getArticleListCache(toArticleListCacheKey(id));
      if (cached) {
        setArticles(cached.articles);
        setPageData(cached.pageData);
        setCurrentPage(cached.currentPage);
        setEndReached(cached.endReached);
        setFetchError(false);
        setIsLoadingInitial(false);
        return;
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
    if (isLoadingMoreRef.current || isLoadingInitialRef.current || endReachedRef.current) {
      return;
    }
    if (currentPageRef.current >= pageDataRef.current.pages) {
      setEndReached(true);
      return;
    }

    const categoryId = currentCategoryId;
    const nextPage = currentPageRef.current + 1;
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
  }, [currentCategoryId, fetchPage]);

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
