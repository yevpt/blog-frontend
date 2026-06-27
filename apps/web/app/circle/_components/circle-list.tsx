"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserListItemResp, UserPageResp } from "@repo/api";
import { apiJson } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import { resolveBootCircleListState, setCircleListCache } from "@/lib/circle-list-cache";
import { UserCard } from "./user-card";
import { VirtuosoGrid } from "react-virtuoso";
import { CIRCLE_PAGE_SIZE, CIRCLE_GRID_ITEM_INNER_CLASS, sortCircleUsers } from "./circle-grid";
import { CIRCLE_VIRTUOSO_COMPONENTS } from "./circle-virtuoso-grid";
import { CircleGridShell } from "./circle-grid-shell";
import { useCircleVirtualBuffer } from "./use-circle-virtual-buffer";

interface CircleListProps {
  initialPage: UserPageResp;
}

export function CircleList({ initialPage }: CircleListProps) {
  const bootState = resolveBootCircleListState(initialPage);

  const [users, setUsers] = useState<UserListItemResp[]>(bootState.users);
  const [currentPage, setCurrentPage] = useState(bootState.currentPage);
  const [totalPages, setTotalPages] = useState(bootState.totalPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(bootState.endReached);
  const [fetchError, setFetchError] = useState(false);

  const animatedIds = useRef(new Set<string>(bootState.users.map((u) => String(u.id))));
  const viewportBuffer = useCircleVirtualBuffer();

  useEffect(() => {
    setCircleListCache({ users, currentPage, totalPages, endReached });
  }, [users, currentPage, totalPages, endReached]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || endReached) return;
    if (currentPage >= totalPages) {
      setEndReached(true);
      return;
    }

    setIsLoadingMore(true);
    setFetchError(false);

    const nextPage = currentPage + 1;
    try {
      const qs = buildQuery({ page: nextPage, page_size: CIRCLE_PAGE_SIZE });
      const data = await apiJson<UserPageResp>(`/api/users/public?${qs}`);
      const sorted = sortCircleUsers(data.list);

      setUsers((prev) => {
        const map = new Map(prev.map((u) => [u.id, u]));
        for (const u of sorted) map.set(u.id, u);
        return [...map.values()];
      });
      setCurrentPage(nextPage);
      setTotalPages(data.pages);
      if (nextPage >= data.pages) setEndReached(true);
    } catch {
      setFetchError(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, endReached, currentPage, totalPages]);

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--fg3) animate-view-enter">
        <p className="text-sm">暂无用户数据</p>
      </div>
    );
  }

  return (
    <CircleGridShell data-testid="circle-grid-shell">
      <VirtuosoGrid
        useWindowScroll
        data={users}
        endReached={loadMore}
        overscan={viewportBuffer}
        increaseViewportBy={viewportBuffer}
        initialItemCount={bootState.users.length}
        computeItemKey={(_, user) => user.id}
        components={CIRCLE_VIRTUOSO_COMPONENTS}
        itemContent={(index, user) => (
          <div className={CIRCLE_GRID_ITEM_INNER_CLASS}>
            <UserCard user={user} index={index} animatedIds={animatedIds} />
          </div>
        )}
      />

      {isLoadingMore && (
        <div className="moment-scroll-loader">
          <div className="moment-loader-dots">
            <div className="moment-loader-dot" />
            <div className="moment-loader-dot" />
            <div className="moment-loader-dot" />
          </div>
          <span className="moment-loader-text">加载更多成员…</span>
        </div>
      )}

      {endReached && !isLoadingMore && (
        <div className="moment-end-reached">全部 {users.length} 位成员</div>
      )}

      {fetchError && !isLoadingMore && (
        <p className="mt-6 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
      )}
    </CircleGridShell>
  );
}
