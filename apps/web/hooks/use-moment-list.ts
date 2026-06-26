"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MomentDeleteResp,
  MomentFeedSort,
  MomentItemResp,
  MomentLikeResp,
  MomentPageResp,
  MomentTopResp,
} from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useMomentModal } from "@/store/use-moment-modal";
import { addToast } from "@/lib/toast";
import { apiForm, apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import type { MomentImageItem } from "@/components/moments/types";

export type MomentTab = "all" | "owner" | "friends";
export type MomentSort = "latest" | "popular";
export type MomentListMode = "feed" | "user";

/** 后端博主固定 user_id=1 */
const BLOG_OWNER_USER_ID = 1;

export interface MomentFeedQuery {
  tab: MomentTab;
  sort: MomentSort;
  page: number;
  pageSize: number;
}

export interface MomentUserQuery {
  userId: number;
  page: number;
  pageSize: number;
}

export interface UseMomentListOptions {
  initialPage: MomentPageResp;
  /** feed：独立页；user：个人页按 user_id 查询（置顶优先） */
  mode?: MomentListMode;
  userId?: number;
  initialTab?: MomentTab;
  initialSort?: MomentSort;
}

function sortToFeedSort(sort: MomentSort): MomentFeedSort {
  return sort === "popular" ? "hot" : "latest";
}

export function buildMomentFeedUrl(query: MomentFeedQuery): string {
  const qs = buildQuery({
    scope: query.tab,
    sort: sortToFeedSort(query.sort),
    page: query.page,
    page_size: query.pageSize,
  });
  return `/api/moments/feed?${qs}`;
}

export function buildMomentUserUrl(query: MomentUserQuery): string {
  const qs = buildQuery({
    user_id: query.userId,
    page: query.page,
    page_size: query.pageSize,
  });
  return `/api/moments?${qs}`;
}

function shouldRefreshForPublishedMoment(
  mode: MomentListMode,
  tab: MomentTab,
  userId: number | undefined,
  publishedUserId: number | null,
): boolean {
  if (publishedUserId === null) {
    return false;
  }
  if (mode === "user" && userId !== undefined) {
    return publishedUserId === userId;
  }
  if (mode === "feed" && tab === "owner") {
    return publishedUserId === BLOG_OWNER_USER_ID;
  }
  return true;
}

function computeEndReached(page: number, pages: number): boolean {
  if (pages <= 0) {
    return false;
  }
  return page >= pages;
}

export function useMomentList({
  initialPage,
  mode = "feed",
  userId,
  initialTab = "all",
  initialSort = "latest",
}: UseMomentListOptions) {
  const { userId: sessionUserId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const publishCount = useMomentModal((s) => s.publishCount);
  const lastPublishedUserId = useMomentModal((s) => s.lastPublishedUserId);

  const [activeTab, setActiveTab] = useState<MomentTab>(initialTab);
  const [activeSort, setActiveSort] = useState<MomentSort>(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [pageData, setPageData] = useState(initialPage);
  const [moments, setMoments] = useState(initialPage.list);
  // 个人页 user 模式：Tab 懒挂载，首屏在客户端拉列表
  const [isLoadingInitial, setIsLoadingInitial] = useState(() => mode === "user");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(() =>
    computeEndReached(initialPage.page, initialPage.pages),
  );
  const [fetchError, setFetchError] = useState(false);
  const [pendingLikeIds, setPendingLikeIds] = useState<ReadonlySet<number>>(() => new Set());
  const [pendingActionIds, setPendingActionIds] = useState<ReadonlySet<number>>(() => new Set());

  const prevUserIdRef = useRef<number | null>(sessionUserId);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const prevPublishCountRef = useRef(publishCount);
  const pendingLikeIdsRef = useRef(pendingLikeIds);
  const pendingActionIdsRef = useRef(pendingActionIds);
  pendingLikeIdsRef.current = pendingLikeIds;
  pendingActionIdsRef.current = pendingActionIds;

  const buildFeedQuery = useCallback(
    (page: number, tab: MomentTab, sort: MomentSort): MomentFeedQuery => ({
      tab,
      sort,
      page,
      pageSize: pageData.page_size,
    }),
    [pageData.page_size],
  );

  const buildUserQuery = useCallback(
    (page: number): MomentUserQuery => ({
      userId: userId ?? 0,
      page,
      pageSize: pageData.page_size,
    }),
    [pageData.page_size, userId],
  );

  const fetchPage = useCallback(
    async (page: number, tab: MomentTab, sort: MomentSort): Promise<MomentPageResp | null> => {
      try {
        const url =
          mode === "user"
            ? buildMomentUserUrl(buildUserQuery(page))
            : buildMomentFeedUrl(buildFeedQuery(page, tab, sort));
        return await apiJson<MomentPageResp>(url);
      } catch {
        return null;
      }
    },
    [buildFeedQuery, buildUserQuery, mode],
  );

  const applyPageData = useCallback((data: MomentPageResp) => {
    setMoments(data.list);
    setPageData(data);
    setCurrentPage(data.page);
    setEndReached(computeEndReached(data.page, data.pages));
  }, []);

  const refreshForSessionChange = useCallback(async () => {
    setFetchError(false);
    const data = await fetchPage(1, activeTab, activeSort);
    if (!data) {
      return;
    }
    applyPageData(data);
  }, [activeSort, activeTab, applyPageData, fetchPage]);

  useEffect(() => {
    if (prevUserIdRef.current === sessionUserId) {
      return;
    }
    prevUserIdRef.current = sessionUserId;
    void refreshForSessionChange();
  }, [refreshForSessionChange, sessionUserId]);

  useEffect(() => {
    if (mode !== "user" || userId === undefined) {
      return;
    }

    let cancelled = false;

    const loadInitialUserPage = async () => {
      setIsLoadingInitial(true);
      setFetchError(false);

      const data = await fetchPage(1, activeTab, activeSort);

      if (cancelled || userIdRef.current !== userId) {
        setIsLoadingInitial(false);
        return;
      }

      if (data) {
        applyPageData(data);
      } else {
        setFetchError(true);
      }

      setIsLoadingInitial(false);
    };

    void loadInitialUserPage();

    return () => {
      cancelled = true;
    };
  }, [activeSort, activeTab, applyPageData, fetchPage, mode, userId]);

  const refreshToFirstPage = useCallback(async () => {
    setFetchError(false);
    const data = await fetchPage(1, activeTab, activeSort);
    if (!data) {
      setFetchError(true);
      return;
    }
    applyPageData(data);
  }, [activeSort, activeTab, applyPageData, fetchPage]);

  useEffect(() => {
    if (prevPublishCountRef.current === publishCount) {
      return;
    }
    prevPublishCountRef.current = publishCount;
    if (!shouldRefreshForPublishedMoment(mode, activeTab, userId, lastPublishedUserId)) {
      return;
    }
    void refreshToFirstPage();
  }, [activeTab, lastPublishedUserId, mode, publishCount, refreshToFirstPage, userId]);

  const reloadFirstPage = useCallback(
    async (tab: MomentTab, sort: MomentSort) => {
      setIsLoadingInitial(true);
      setEndReached(false);
      setFetchError(false);

      const data = await fetchPage(1, tab, sort);
      if (data) {
        applyPageData(data);
      } else {
        setFetchError(true);
      }

      setIsLoadingInitial(false);
    },
    [applyPageData, fetchPage],
  );

  const changeTab = useCallback(
    async (tab: MomentTab) => {
      if (mode !== "feed" || tab === activeTab) {
        return;
      }
      setActiveTab(tab);
      await reloadFirstPage(tab, activeSort);
    },
    [activeSort, activeTab, mode, reloadFirstPage],
  );

  const changeSort = useCallback(
    async (sort: MomentSort) => {
      if (mode !== "feed" || sort === activeSort) {
        return;
      }
      setActiveSort(sort);
      await reloadFirstPage(activeTab, sort);
    },
    [activeSort, activeTab, mode, reloadFirstPage],
  );

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
    const data = await fetchPage(nextPage, activeTab, activeSort);

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
    activeSort,
    activeTab,
    currentPage,
    endReached,
    fetchPage,
    isLoadingInitial,
    isLoadingMore,
    pageData.pages,
  ]);

  const toggleLike = useCallback(
    async (moment: MomentItemResp) => {
      if (sessionUserId == null) {
        openLoginModal();
        return;
      }
      if (pendingLikeIdsRef.current.has(moment.id)) {
        return;
      }

      setPendingLikeIds((current) => new Set([...current, moment.id]));
      try {
        const data = await apiJson<MomentLikeResp>(`/api/moments/${moment.id}/like`, {
          method: "POST",
        });
        setMoments((current) =>
          current.map((item) =>
            item.id === moment.id
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
            moment.is_liked ? "取消点赞失败，请稍后重试" : "点赞失败，请稍后重试",
          ),
          "error",
        );
      } finally {
        setPendingLikeIds((current) => {
          const next = new Set(current);
          next.delete(moment.id);
          return next;
        });
      }
    },
    [openLoginModal, sessionUserId],
  );

  const updateMoment = useCallback(
    async (moment: MomentItemResp, content: string, images: MomentImageItem[]) => {
      if (pendingActionIdsRef.current.has(moment.id)) {
        return moment;
      }

      setPendingActionIds((current) => new Set([...current, moment.id]));
      try {
        const form = new FormData();
        form.append("id", String(moment.id));
        form.append("content", content);
        form.append("status", String(moment.status));
        form.append("comment_status", String(moment.comment_status));

        images.forEach((image) => {
          if (image.file) {
            form.append("images", image.file, image.file.name);
            form.append("image_order", `file:${form.getAll("images").length - 1}`);
          } else if (image.remoteUrl) {
            form.append("image_urls", image.remoteUrl);
            form.append("image_order", `url:${form.getAll("image_urls").length - 1}`);
          }
        });

        const updated = await apiForm<MomentItemResp>("/api/moments", form, { method: "POST" });
        setMoments((current) =>
          current.map((item) => (item.id === moment.id ? { ...item, ...updated } : item)),
        );
        addToast("碎语已更新", "success");
        return updated;
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
        } else {
          addToast(getApiErrorMessage(err, "更新失败，请稍后重试"), "error");
        }
        throw err;
      } finally {
        setPendingActionIds((current) => {
          const next = new Set(current);
          next.delete(moment.id);
          return next;
        });
      }
    },
    [openLoginModal],
  );

  const toggleTop = useCallback(
    async (moment: MomentItemResp) => {
      if (pendingActionIdsRef.current.has(moment.id)) {
        return;
      }

      setPendingActionIds((current) => new Set([...current, moment.id]));
      try {
        const data = await apiJson<MomentTopResp>(`/api/moments/${moment.id}/top`, {
          method: moment.is_top ? "DELETE" : "POST",
        });
        setMoments((current) =>
          current.map((item) => (item.id === moment.id ? { ...item, is_top: data.is_top } : item)),
        );
        addToast(data.is_top ? "已置顶" : "已取消置顶", "success");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(
          getApiErrorMessage(
            err,
            moment.is_top ? "取消置顶失败，请稍后重试" : "置顶失败，请稍后重试",
          ),
          "error",
        );
      } finally {
        setPendingActionIds((current) => {
          const next = new Set(current);
          next.delete(moment.id);
          return next;
        });
      }
    },
    [openLoginModal],
  );

  const deleteMoment = useCallback(
    async (moment: MomentItemResp) => {
      if (pendingActionIdsRef.current.has(moment.id)) {
        return;
      }

      setPendingActionIds((current) => new Set([...current, moment.id]));
      try {
        await apiJson<MomentDeleteResp>(`/api/moments/${moment.id}`, { method: "DELETE" });
        setMoments((current) => current.filter((item) => item.id !== moment.id));
        setPageData((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
        addToast("碎语已删除", "success");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(getApiErrorMessage(err, "删除失败，请稍后重试"), "error");
        throw err;
      } finally {
        setPendingActionIds((current) => {
          const next = new Set(current);
          next.delete(moment.id);
          return next;
        });
      }
    },
    [openLoginModal],
  );

  return {
    activeTab,
    activeSort,
    sortedMoments: moments,
    moments,
    pageData,
    isLoadingInitial,
    isLoadingMore,
    endReached,
    fetchError,
    pendingLikeIds,
    pendingActionIds,
    changeTab,
    changeSort,
    loadMore,
    toggleLike,
    updateMoment,
    toggleTop,
    deleteMoment,
    refreshToFirstPage,
    setMoments,
  };
}
