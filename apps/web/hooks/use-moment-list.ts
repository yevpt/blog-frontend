"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MomentItemResp, MomentLikeResp, MomentPageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { apiJson, ApiClientError } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";

export type MomentTab = "all" | "owner" | "friends";
export type MomentSort = "latest" | "popular";

export interface MomentListQuery {
  tab: MomentTab;
  page: number;
  pageSize: number;
  ownerUserId?: number;
  friendRoleId?: number;
}

export interface UseMomentListOptions {
  initialPage: MomentPageResp;
  ownerUserId?: number;
  friendRoleId?: number;
}

export function buildMomentListUrl(query: MomentListQuery): string {
  const qs = buildQuery({
    page: query.page,
    page_size: query.pageSize,
    ...(query.tab === "owner" && query.ownerUserId !== undefined
      ? { user_id: query.ownerUserId }
      : {}),
    ...(query.tab === "friends" && query.friendRoleId !== undefined
      ? { role_id: query.friendRoleId }
      : {}),
  });
  return `/api/moments?${qs}`;
}

export function useMomentList({ initialPage, ownerUserId, friendRoleId }: UseMomentListOptions) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const [activeTab, setActiveTab] = useState<MomentTab>("all");
  const [activeSort, setActiveSort] = useState<MomentSort>("latest");
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [pageData, setPageData] = useState(initialPage);
  const [moments, setMoments] = useState(initialPage.list);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(initialPage.page >= initialPage.pages);
  const [fetchError, setFetchError] = useState(false);
  const [pendingLikeIds, setPendingLikeIds] = useState<ReadonlySet<number>>(() => new Set());

  const prevUserIdRef = useRef<number | null>(userId);
  const pendingLikeIdsRef = useRef(pendingLikeIds);
  pendingLikeIdsRef.current = pendingLikeIds;

  const buildQueryFor = useCallback(
    (page: number, tab: MomentTab): MomentListQuery => ({
      tab,
      page,
      pageSize: pageData.page_size,
      ownerUserId,
      friendRoleId,
    }),
    [pageData.page_size, ownerUserId, friendRoleId],
  );

  const fetchPage = useCallback(async (query: MomentListQuery): Promise<MomentPageResp | null> => {
    try {
      return await apiJson<MomentPageResp>(buildMomentListUrl(query));
    } catch {
      return null;
    }
  }, []);

  const refreshForSessionChange = useCallback(async () => {
    setFetchError(false);
    const data = await fetchPage(buildQueryFor(currentPage, activeTab));
    if (!data) {
      return;
    }
    setMoments(data.list);
    setPageData(data);
    setCurrentPage(data.page);
    setEndReached(data.page >= data.pages);
  }, [activeTab, buildQueryFor, currentPage, fetchPage]);

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      return;
    }
    prevUserIdRef.current = userId;
    void refreshForSessionChange();
  }, [refreshForSessionChange, userId]);

  const changeTab = useCallback(
    async (tab: MomentTab) => {
      if (tab === activeTab) {
        return;
      }
      setActiveTab(tab);
      setIsLoadingInitial(true);
      setEndReached(false);
      setFetchError(false);

      const data = await fetchPage(buildQueryFor(1, tab));
      if (data) {
        setMoments(data.list);
        setPageData(data);
        setCurrentPage(1);
        setEndReached(data.pages <= 1);
      } else {
        setFetchError(true);
      }

      setIsLoadingInitial(false);
    },
    [activeTab, buildQueryFor, fetchPage],
  );

  const changeSort = useCallback((sort: MomentSort) => {
    setActiveSort(sort);
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || endReached || isLoadingInitial) {
      return;
    }
    if (currentPage >= pageData.pages) {
      setEndReached(true);
      return;
    }

    setIsLoadingMore(true);
    setFetchError(false);

    const nextPage = currentPage + 1;
    const data = await fetchPage(buildQueryFor(nextPage, activeTab));

    if (data) {
      setMoments((prev) => [...prev, ...data.list]);
      setPageData(data);
      setCurrentPage(nextPage);
      if (nextPage >= data.pages) {
        setEndReached(true);
      }
    } else {
      setFetchError(true);
    }

    setIsLoadingMore(false);
  }, [
    activeTab,
    buildQueryFor,
    currentPage,
    endReached,
    fetchPage,
    isLoadingInitial,
    isLoadingMore,
    pageData.pages,
  ]);

  const sortedMoments = useMemo(() => {
    if (activeSort === "popular") {
      return [...moments].sort((a, b) => b.like_count - a.like_count);
    }
    return moments;
  }, [activeSort, moments]);

  const toggleLike = useCallback(
    async (snippet: MomentItemResp) => {
      if (userId == null) {
        openLoginModal();
        return;
      }
      if (pendingLikeIdsRef.current.has(snippet.id)) {
        return;
      }

      setPendingLikeIds((current) => new Set([...current, snippet.id]));
      try {
        const data = await apiJson<MomentLikeResp>(`/api/moments/${snippet.id}/like`, {
          method: "POST",
        });
        setMoments((current) =>
          current.map((item) =>
            item.id === snippet.id
              ? { ...item, is_liked: data.is_liked, like_count: data.like_count }
              : item,
          ),
        );
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(snippet.is_liked ? "取消点赞失败，请稍后重试" : "点赞失败，请稍后重试", "error");
      } finally {
        setPendingLikeIds((current) => {
          const next = new Set(current);
          next.delete(snippet.id);
          return next;
        });
      }
    },
    [openLoginModal, userId],
  );

  return {
    activeTab,
    activeSort,
    sortedMoments,
    moments,
    pageData,
    isLoadingInitial,
    isLoadingMore,
    endReached,
    fetchError,
    pendingLikeIds,
    changeTab,
    changeSort,
    loadMore,
    toggleLike,
    setMoments,
  };
}
