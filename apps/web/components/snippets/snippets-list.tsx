"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MomentPageResp, MomentItemResp } from "@repo/api";
import dynamic from "next/dynamic";
import { useMomentEngagement } from "@/hooks/use-moment-engagement";
import { Card } from "@repo/ui";
import { SnippetCard } from "./snippet-card";
import { SnippetCardSkeleton } from "./snippet-card-skeleton";
import { SnippetFilterBar, type SnippetSort, type SnippetTab } from "./snippet-filter-bar";
import { SnippetScrollLoader, SnippetEndReached } from "./snippet-scroll-loader";

const CommentModal = dynamic(() => import("@/components/comments").then((m) => m.CommentModal), {
  ssr: false,
});

interface SnippetsListProps {
  initialPage: MomentPageResp;
  ownerUserId?: number;
  /** 朋友们 Tab 对应的 role_id，由页面注入 */
  friendRoleId?: number;
}

const SKELETON_COUNT = 8;

/** 与 Tailwind sm/lg 断点保持一致 */
export function getSnippetColumnCount(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

/**
 * 响应式列数 — 由 SnippetsListLoader 保证仅在客户端挂载后渲染，
 * 首帧即可读到 window.innerWidth，避免 1 列 → N 列闪烁。
 */
function useColumnCount(): number {
  const [columns, setColumns] = useState(() => getSnippetColumnCount(window.innerWidth));

  useLayoutEffect(() => {
    const update = () => setColumns(getSnippetColumnCount(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}

/** 估算卡片高度，用于瀑布流高度感知分配 */
function estimateHeight(snippet: MomentItemResp): number {
  let height = 120; // 基础高度（头部、底部操作栏、padding等）
  const textLen = snippet.content ? snippet.content.length : 0;
  height += Math.min(textLen * 0.8, 300); // 文本高度估算，每字符约0.8px，最高限制300px
  if (snippet.images && snippet.images.length > 0) {
    // 单图更宽且比例3:2所以更高，多图为双列网格所以较矮
    height += snippet.images.length === 1 ? 250 : 130;
  }
  return height;
}

interface ColumnItem {
  snippet: MomentItemResp;
  delay: number;
}

function distributeToColumns(
  items: MomentItemResp[],
  columnCount: number,
  pageSize: number,
): ColumnItem[][] {
  const cols: ColumnItem[][] = Array.from({ length: columnCount }, () => []);
  const colWeights = Array.from({ length: columnCount }, () => 0);

  items.forEach((item, index) => {
    // 寻找当前高度（权重）最矮的列
    let minCol = 0;
    let minWeight = colWeights[0];
    for (let i = 1; i < columnCount; i++) {
      if (colWeights[i] < minWeight) {
        minWeight = colWeights[i];
        minCol = i;
      }
    }

    cols[minCol].push({
      snippet: item,
      // 动画延迟基于当前批次内的索引，避免无限累加导致加载更多时出现长时间空白
      delay: (index % pageSize) * 0.08,
    });

    colWeights[minCol] += estimateHeight(item);
  });

  return cols;
}

/** Tab 切换时的 flex 瀑布流骨架屏 */
function SnippetMasonrySkeleton({ columnCount }: { columnCount: number }) {
  return (
    <div className="flex gap-[14px]">
      {Array.from({ length: columnCount }, (_, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-[14px]">
          {Array.from({ length: Math.ceil(SKELETON_COUNT / columnCount) }, (_, rowIdx) => (
            <div
              key={rowIdx}
              className="animate-[snippetCardEnter_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{ animationDelay: `${rowIdx * 0.08}s` }}
            >
              <SnippetCardSkeleton variant={rowIdx * columnCount + colIdx} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 碎语列表（flex 瀑布流 + 无限滚动 + Tab/排序筛选）
 *
 * 布局原理：
 * - round-robin 将卡片分配到 N 个 flex 列，位置一旦确定不再变动
 * - 展开/收起内容不会导致卡片跨列漂移
 * - 排序后卡片按 top→bottom, left→right 排列
 */
export function SnippetsList({ initialPage, ownerUserId, friendRoleId }: SnippetsListProps) {
  const [activeTab, setActiveTab] = useState<SnippetTab>("all");
  const [activeSort, setActiveSort] = useState<SnippetSort>("latest");
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [pageData, setPageData] = useState(initialPage);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(initialPage.page >= initialPage.pages);
  const [fetchError, setFetchError] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const columnCount = useColumnCount();

  const getRefreshParams = useCallback(
    () => ({ page: currentPage, pageSize: pageData.page_size }),
    [currentPage, pageData.page_size],
  );

  const {
    moments,
    setMoments,
    activeComment,
    pendingLikeIds,
    handleLike,
    openComment,
    closeComment,
    handleCommentAdded,
  } = useMomentEngagement({
    initialMoments: initialPage.list,
    ownerUserId: activeTab === "owner" ? ownerUserId : undefined,
    getRefreshParams,
    onRefresh: setPageData,
  });

  const sortedMoments = useMemo(() => {
    if (activeSort === "popular") {
      return [...moments].sort((a, b) => b.like_count - a.like_count);
    }
    return moments;
  }, [moments, activeSort]);

  const columnItems = useMemo(
    () => distributeToColumns(sortedMoments, columnCount, pageData.page_size || 20),
    [sortedMoments, columnCount, pageData.page_size],
  );

  const fetchMomentsPage = useCallback(
    async (page: number, tab: SnippetTab): Promise<MomentPageResp | null> => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageData.page_size),
        });
        if (tab === "owner" && ownerUserId !== undefined) {
          params.set("user_id", String(ownerUserId));
        } else if (tab === "friends" && friendRoleId !== undefined) {
          params.set("role_id", String(friendRoleId));
        }
        const res = await fetch(`/api/moments?${params.toString()}`);
        if (!res.ok) throw new Error("fetch failed");
        return (await res.json()) as MomentPageResp;
      } catch {
        return null;
      }
    },
    [ownerUserId, friendRoleId, pageData.page_size],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || endReached || isLoadingInitial) return;
    if (currentPage >= pageData.pages) {
      setEndReached(true);
      return;
    }

    setIsLoadingMore(true);
    setFetchError(false);

    const nextPage = currentPage + 1;
    const data = await fetchMomentsPage(nextPage, activeTab);

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
    isLoadingMore,
    endReached,
    isLoadingInitial,
    currentPage,
    pageData.pages,
    activeTab,
    fetchMomentsPage,
    setMoments,
  ]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "200px" },
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);

    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  const handleTabChange = useCallback(
    async (tab: SnippetTab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      setIsLoadingInitial(true);
      setEndReached(false);
      setFetchError(false);

      const data = await fetchMomentsPage(1, tab);
      if (data) {
        setMoments(data.list);
        setPageData(data);
        setCurrentPage(1);
        if (data.pages <= 1) setEndReached(true);
      } else {
        setFetchError(true);
      }

      setIsLoadingInitial(false);
    },
    [activeTab, fetchMomentsPage, setMoments],
  );

  const handleSortChange = useCallback((sort: SnippetSort) => {
    setActiveSort(sort);
  }, []);

  if (moments.length === 0 && !isLoadingInitial && !isLoadingMore) {
    return (
      <>
        <SnippetFilterBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          activeSort={activeSort}
          onSortChange={handleSortChange}
        />
        <Card className="rounded-2xl py-8 text-center">
          <p className="text-sm text-(--fg3)">暂无碎语</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <SnippetFilterBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        activeSort={activeSort}
        onSortChange={handleSortChange}
      />

      {isLoadingInitial ? (
        <SnippetMasonrySkeleton columnCount={columnCount} />
      ) : (
        <>
          <div className="flex gap-[14px]">
            {columnItems.map((col, colIdx) => (
              <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-[14px]">
                {col.map(({ snippet, delay }) => (
                  <div
                    key={snippet.id}
                    className="animate-[snippetCardEnter_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
                    style={{ animationDelay: `${delay}s` }}
                  >
                    <SnippetCard
                      snippet={snippet}
                      onLike={handleLike}
                      likeDisabled={pendingLikeIds.includes(snippet.id)}
                      onComment={openComment}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {isLoadingMore && <SnippetScrollLoader />}
          {endReached && !isLoadingMore && <SnippetEndReached />}

          {!endReached && !isLoadingMore && !fetchError && (
            <div ref={sentinelRef} className="h-px" />
          )}

          {fetchError && !isLoadingMore && (
            <p className="mt-4 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
          )}
        </>
      )}

      {activeComment !== null && (
        <CommentModal
          targetType="moment"
          targetId={activeComment.momentId}
          onClose={closeComment}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </>
  );
}
