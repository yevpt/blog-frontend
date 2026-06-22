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
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [pendingLikeIds, setPendingLikeIds] = useState<ReadonlySet<number>>(() => new Set());

  const abortRef = useRef<AbortController | null>(null);
  const pendingLikeIdsRef = useRef(pendingLikeIds);
  pendingLikeIdsRef.current = pendingLikeIds;

  const fetchPage = useCallback(async (categoryId: number, page: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    try {
      const qs = buildQuery({
        page,
        ...(categoryId !== ALL_CATEGORY_ID ? { category_id: categoryId } : {}),
      });
      const data = await apiJson<ArticlePageResp>(`/api/articles?${qs}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setPageData(data);
      setFetchError(false);
    } catch (err) {
      if (isAbortError(err)) return;
      setFetchError(true);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const changeCategory = useCallback(
    (id: number) => {
      setFetchError(false);
      if (!isControlled) {
        setInternalCategoryId(id);
      }
      setCurrentPage(1);
      void fetchPage(id, 1);
    },
    [fetchPage, isControlled],
  );

  const changePage = useCallback(
    (page: number) => {
      setFetchError(false);
      setCurrentPage(page);
      void fetchPage(currentCategoryId, page);
    },
    [currentCategoryId, fetchPage],
  );

  const refreshForSessionChange = useCallback(() => {
    setFetchError(false);
    return fetchPage(currentCategoryId, currentPage);
  }, [currentCategoryId, currentPage, fetchPage]);

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
        setPageData((current) => ({
          ...current,
          list: current.list.map((item) =>
            item.id === article.id
              ? { ...item, is_liked: data.is_liked, like_count: data.like_count }
              : item,
          ),
        }));
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
    isLoading,
    fetchError,
    pendingLikeIds,
    changeCategory,
    changePage,
    toggleLike,
    refreshForSessionChange,
    setPageData,
  };
}
