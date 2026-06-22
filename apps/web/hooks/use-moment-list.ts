"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MomentDeleteResp,
  MomentItemResp,
  MomentLikeResp,
  MomentPageResp,
  MomentTopResp,
} from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { addToast } from "@/lib/toast";
import { apiForm, apiJson, ApiClientError } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import type { SnippetImageItem } from "@/components/snippets/types";

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
  initialTab?: MomentTab;
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

function shouldRefreshForPublishedMoment(
  tab: MomentTab,
  ownerUserId: number | undefined,
  publishedUserId: number | null,
): boolean {
  if (tab === "owner" && ownerUserId !== undefined && publishedUserId !== null) {
    return publishedUserId === ownerUserId;
  }
  return true;
}

export function useMomentList({
  initialPage,
  ownerUserId,
  friendRoleId,
  initialTab = "all",
}: UseMomentListOptions) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const publishCount = useSnippetModal((s) => s.publishCount);
  const lastPublishedUserId = useSnippetModal((s) => s.lastPublishedUserId);

  const [activeTab, setActiveTab] = useState<MomentTab>(initialTab);
  const [activeSort, setActiveSort] = useState<MomentSort>("latest");
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [pageData, setPageData] = useState(initialPage);
  const [moments, setMoments] = useState(initialPage.list);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(initialPage.page >= initialPage.pages);
  const [fetchError, setFetchError] = useState(false);
  const [pendingLikeIds, setPendingLikeIds] = useState<ReadonlySet<number>>(() => new Set());
  const [pendingActionIds, setPendingActionIds] = useState<ReadonlySet<number>>(() => new Set());

  const prevUserIdRef = useRef<number | null>(userId);
  const prevPublishCountRef = useRef(publishCount);
  const pendingLikeIdsRef = useRef(pendingLikeIds);
  const pendingActionIdsRef = useRef(pendingActionIds);
  pendingLikeIdsRef.current = pendingLikeIds;
  pendingActionIdsRef.current = pendingActionIds;

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
    const data = await fetchPage(buildQueryFor(1, activeTab));
    if (!data) {
      return;
    }
    setMoments(data.list);
    setPageData(data);
    setCurrentPage(1);
    setEndReached(data.page >= data.pages);
  }, [activeTab, buildQueryFor, fetchPage]);

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      return;
    }
    prevUserIdRef.current = userId;
    void refreshForSessionChange();
  }, [refreshForSessionChange, userId]);

  // 刷新到当前 Tab 的第一页，丢弃已加载的后续页（用于「发布新碎语后」让其立即出现在顶部）
  const refreshToFirstPage = useCallback(async () => {
    setFetchError(false);
    const data = await fetchPage(buildQueryFor(1, activeTab));
    if (!data) {
      setFetchError(true);
      return;
    }
    setMoments(data.list);
    setPageData(data);
    setCurrentPage(1);
    setEndReached(data.page >= data.pages);
  }, [activeTab, buildQueryFor, fetchPage]);

  // 写碎语弹窗发布成功后会自增 publishCount，这里订阅其变化刷新列表
  useEffect(() => {
    if (prevPublishCountRef.current === publishCount) {
      return;
    }
    prevPublishCountRef.current = publishCount;
    if (!shouldRefreshForPublishedMoment(activeTab, ownerUserId, lastPublishedUserId)) {
      return;
    }
    void refreshToFirstPage();
  }, [activeTab, lastPublishedUserId, ownerUserId, publishCount, refreshToFirstPage]);

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

  const updateMoment = useCallback(
    async (snippet: MomentItemResp, content: string, images: SnippetImageItem[]) => {
      if (pendingActionIdsRef.current.has(snippet.id)) {
        return snippet;
      }

      setPendingActionIds((current) => new Set([...current, snippet.id]));
      try {
        const form = new FormData();
        form.append("id", String(snippet.id));
        form.append("content", content);
        form.append("status", String(snippet.status));
        form.append("comment_status", String(snippet.comment_status));

        // 后端要求：images 传新文件，image_urls 传已有图片 URL，image_order 标记最终顺序
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
          current.map((item) => (item.id === snippet.id ? { ...item, ...updated } : item)),
        );
        addToast("碎语已更新", "success");
        return updated;
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
        } else {
          addToast(err instanceof ApiClientError ? err.message : "更新失败，请稍后重试", "error");
        }
        throw err;
      } finally {
        setPendingActionIds((current) => {
          const next = new Set(current);
          next.delete(snippet.id);
          return next;
        });
      }
    },
    [openLoginModal],
  );

  const toggleTop = useCallback(
    async (snippet: MomentItemResp) => {
      if (pendingActionIdsRef.current.has(snippet.id)) {
        return;
      }

      setPendingActionIds((current) => new Set([...current, snippet.id]));
      try {
        const data = await apiJson<MomentTopResp>(`/api/moments/${snippet.id}/top`, {
          method: snippet.is_top ? "DELETE" : "POST",
        });
        setMoments((current) =>
          current.map((item) => (item.id === snippet.id ? { ...item, is_top: data.is_top } : item)),
        );
        addToast(data.is_top ? "已置顶" : "已取消置顶", "success");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(
          err instanceof ApiClientError
            ? err.message
            : snippet.is_top
              ? "取消置顶失败，请稍后重试"
              : "置顶失败，请稍后重试",
          "error",
        );
      } finally {
        setPendingActionIds((current) => {
          const next = new Set(current);
          next.delete(snippet.id);
          return next;
        });
      }
    },
    [openLoginModal],
  );

  const deleteMoment = useCallback(
    async (snippet: MomentItemResp) => {
      if (pendingActionIdsRef.current.has(snippet.id)) {
        return;
      }

      setPendingActionIds((current) => new Set([...current, snippet.id]));
      try {
        await apiJson<MomentDeleteResp>(`/api/moments/${snippet.id}`, { method: "DELETE" });
        setMoments((current) => current.filter((item) => item.id !== snippet.id));
        setPageData((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
        addToast("碎语已删除", "success");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(err instanceof ApiClientError ? err.message : "删除失败，请稍后重试", "error");
        throw err;
      } finally {
        setPendingActionIds((current) => {
          const next = new Set(current);
          next.delete(snippet.id);
          return next;
        });
      }
    },
    [openLoginModal],
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
