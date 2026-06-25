"use client";

import { useCallback, useRef, useState } from "react";
import type { UserListItemResp, UserPageResp } from "@repo/api";
import { apiJson } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import { isAdminUser, isVipUser } from "@/lib/user-roles";
import { UserCard } from "./user-card";
import { VirtuosoGrid } from "react-virtuoso";

const PAGE_SIZE = 40;

interface CircleListProps {
  initialPage: UserPageResp;
}

export function CircleList({ initialPage }: CircleListProps) {
  const [users, setUsers] = useState<UserListItemResp[]>(initialPage.list);
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [totalPages, setTotalPages] = useState(initialPage.pages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(initialPage.page >= initialPage.pages);
  const [fetchError, setFetchError] = useState(false);

  // 记录已经播放过入场动画的用户 ID
  const animatedIds = useRef(new Set<string>());

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
      const qs = buildQuery({ page: nextPage, page_size: PAGE_SIZE });
      const data = await apiJson<UserPageResp>(`/api/users/public?${qs}`);

      // 排序：Admin 优先，其次 VIP
      const sorted = [...data.list].sort((a, b) => {
        const aAdmin = isAdminUser(a.roles) ? 1 : 0;
        const bAdmin = isAdminUser(b.roles) ? 1 : 0;
        if (aAdmin !== bAdmin) return bAdmin - aAdmin;
        const aVip = isVipUser(a.roles) ? 1 : 0;
        const bVip = isVipUser(b.roles) ? 1 : 0;
        return bVip - aVip;
      });

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
    <>
      {/* 虚拟滚动网格 */}
      <VirtuosoGrid
        useWindowScroll
        data={users}
        endReached={loadMore}
        overscan={400}
        listClassName="grid grid-cols-3 items-stretch gap-1 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5"
        itemContent={(index, user) => (
          <div className="h-full">
            <UserCard key={user.id} user={user} index={index} animatedIds={animatedIds} />
          </div>
        )}
      />

      {/* 加载中 */}
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

      {/* 已到底 */}
      {endReached && !isLoadingMore && (
        <div className="moment-end-reached">全部 {users.length} 位成员</div>
      )}

      {/* 加载失败 */}
      {fetchError && !isLoadingMore && (
        <p className="mt-6 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
      )}
    </>
  );
}
