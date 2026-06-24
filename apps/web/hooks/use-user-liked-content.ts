"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserLikedContentItemResp, UserLikedContentPageResp } from "@repo/api";
import { apiJson } from "@/lib/client-fetch";
import {
  buildUserLikedContentUrl,
  EMPTY_LIKED_CONTENT_PAGE,
  PROFILE_LIKES_PAGE_SIZE,
  type LikedContentUiFilter,
} from "./use-user-liked-content.shared";

interface UseUserLikedContentOptions {
  userId: number;
}

export function useUserLikedContent({ userId }: UseUserLikedContentOptions) {
  const [filter, setFilter] = useState<LikedContentUiFilter>("all");
  const [items, setItems] = useState<UserLikedContentItemResp[]>([]);
  const [pageData, setPageData] = useState<UserLikedContentPageResp>(EMPTY_LIKED_CONTENT_PAGE);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);
  const [initialError, setInitialError] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchPage = useCallback(
    async (
      page: number,
      nextFilter: LikedContentUiFilter,
    ): Promise<UserLikedContentPageResp | null> => {
      try {
        return await apiJson<UserLikedContentPageResp>(
          buildUserLikedContentUrl({
            userId,
            page,
            pageSize: PROFILE_LIKES_PAGE_SIZE,
            filter: nextFilter,
          }),
        );
      } catch {
        return null;
      }
    },
    [userId],
  );

  const applyPageData = useCallback((data: UserLikedContentPageResp, append: boolean) => {
    setItems((prev) => (append ? [...prev, ...data.list] : data.list));
    setPageData(data);
    setCurrentPage(data.page);
    setEndReached(data.page >= data.pages);
  }, []);

  const reloadFirstPage = useCallback(
    async (nextFilter: LikedContentUiFilter) => {
      setIsLoadingInitial(true);
      setInitialError(false);
      setFetchError(false);
      setEndReached(false);

      const data = await fetchPage(1, nextFilter);
      if (filterRef.current !== nextFilter) {
        setIsLoadingInitial(false);
        return;
      }

      if (!data) {
        setItems([]);
        setPageData(EMPTY_LIKED_CONTENT_PAGE);
        setCurrentPage(0);
        setInitialError(true);
        setIsLoadingInitial(false);
        return;
      }

      applyPageData(data, false);
      setIsLoadingInitial(false);
    },
    [applyPageData, fetchPage],
  );

  const changeFilter = useCallback(
    async (nextFilter: LikedContentUiFilter) => {
      if (nextFilter === filterRef.current) {
        return;
      }
      filterRef.current = nextFilter;
      setFilter(nextFilter);
      await reloadFirstPage(nextFilter);
    },
    [reloadFirstPage],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || endReached || isLoadingInitial || initialError) {
      return;
    }
    if (currentPage >= pageData.pages) {
      setEndReached(true);
      return;
    }

    setIsLoadingMore(true);
    setFetchError(false);

    const nextPage = currentPage + 1;
    const activeFilter = filterRef.current;
    const data = await fetchPage(nextPage, activeFilter);

    if (filterRef.current !== activeFilter) {
      setIsLoadingMore(false);
      return;
    }

    if (data) {
      applyPageData(data, true);
    } else {
      setFetchError(true);
    }

    setIsLoadingMore(false);
  }, [
    applyPageData,
    currentPage,
    endReached,
    fetchPage,
    initialError,
    isLoadingInitial,
    isLoadingMore,
    pageData.pages,
  ]);

  const retryInitial = useCallback(async () => {
    await reloadFirstPage(filterRef.current);
  }, [reloadFirstPage]);

  const retryLoadMore = useCallback(async () => {
    await loadMore();
  }, [loadMore]);

  useEffect(() => {
    filterRef.current = "all";
    setFilter("all");
    void reloadFirstPage("all");
  }, [userId, reloadFirstPage]);

  return {
    filter,
    items,
    pageData,
    isLoadingInitial,
    isLoadingMore,
    endReached,
    initialError,
    fetchError,
    changeFilter,
    loadMore,
    retryInitial,
    retryLoadMore,
  };
}
