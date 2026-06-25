"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MomentPageResp, MomentItemResp } from "@repo/api";
import dynamic from "next/dynamic";
import { useMomentList } from "@/hooks/use-moment-list";
import { useMomentModal } from "@/store/use-moment-modal";
import { Card } from "@repo/ui";
import { MomentCard } from "./moment-card";
import { MomentCardSkeleton } from "./moment-card-skeleton";
import { MomentFilterBar } from "./moment-filter-bar";
import { MomentScrollLoader, MomentEndReached } from "./moment-scroll-loader";
import { distributeToColumns, getMomentColumnCount } from "./moment-masonry";

export { getMomentColumnCount } from "./moment-masonry";

const CommentModal = dynamic(() => import("@/components/comments").then((m) => m.CommentModal), {
  ssr: false,
});

interface MomentsListProps {
  initialPage: MomentPageResp;
}

const SKELETON_COUNT = 8;

function useColumnCount(): number {
  const [columns, setColumns] = useState(() => getMomentColumnCount(window.innerWidth));

  useLayoutEffect(() => {
    const update = () => setColumns(getMomentColumnCount(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}

function MomentMasonrySkeleton({ columnCount }: { columnCount: number }) {
  return (
    <div className="flex gap-[14px]">
      {Array.from({ length: columnCount }, (_, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-[14px]">
          {Array.from({ length: Math.ceil(SKELETON_COUNT / columnCount) }, (_, rowIdx) => (
            <div
              key={rowIdx}
              className="animate-[momentCardEnter_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{ animationDelay: `${rowIdx * 0.08}s` }}
            >
              <MomentCardSkeleton variant={rowIdx * columnCount + colIdx} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 碎语列表（flex 瀑布流 + 无限滚动 + Tab/排序筛选）
 */
export function MomentsList({ initialPage }: MomentsListProps) {
  const {
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
    setMoments,
  } = useMomentList({ initialPage });
  const openMomentModal = useMomentModal((state) => state.open);

  const [activeComment, setActiveComment] = useState<{ momentId: number } | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  const columnCount = useColumnCount();

  const prevAssignmentsRef = useRef<Map<number, number>>(new Map());
  const prevColumnCountRef = useRef<number>(columnCount);
  const prevFirstPageKeyRef = useRef<string | null>(null);
  const prevPageRef = useRef(pageData.page);

  loadMoreRef.current = loadMore;

  const columnItems = useMemo(() => {
    const page = pageData.page || 1;
    const firstPageKey =
      page === 1 ? `${activeTab}:${sortedMoments.map((item) => item.id).join(",")}` : null;
    const shouldResetForFirstPage =
      firstPageKey !== null &&
      (prevPageRef.current !== 1 || prevFirstPageKeyRef.current !== firstPageKey);

    if (prevColumnCountRef.current !== columnCount || shouldResetForFirstPage) {
      prevAssignmentsRef.current = new Map();
      prevColumnCountRef.current = columnCount;
    }
    prevPageRef.current = page;
    prevFirstPageKeyRef.current = firstPageKey;

    const { cols, assignments } = distributeToColumns(
      sortedMoments,
      columnCount,
      pageData.page_size || 20,
      prevAssignmentsRef.current,
    );
    prevAssignmentsRef.current = assignments;
    return cols;
  }, [activeTab, sortedMoments, columnCount, pageData.page, pageData.page_size]);

  const showSentinel = !endReached && !isLoadingMore && !fetchError;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !showSentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showSentinel]);

  const openComment = useCallback((moment: MomentItemResp) => {
    setActiveComment({ momentId: moment.id });
  }, []);

  const openEdit = useCallback(
    (moment: MomentItemResp) => {
      openMomentModal(moment, (content, images) => updateMoment(moment, content, images));
    },
    [openMomentModal, updateMoment],
  );

  const closeComment = useCallback(() => {
    setActiveComment(null);
  }, []);

  const handleCommentAdded = useCallback(() => {
    if (!activeComment) {
      return;
    }
    setMoments((current) =>
      current.map((item) =>
        item.id === activeComment.momentId
          ? { ...item, comment_count: item.comment_count + 1 }
          : item,
      ),
    );
  }, [activeComment, setMoments]);

  if (moments.length === 0 && !isLoadingInitial && !isLoadingMore) {
    return (
      <>
        <MomentFilterBar
          activeTab={activeTab}
          onTabChange={changeTab}
          activeSort={activeSort}
          onSortChange={changeSort}
        />
        <Card className="rounded-2xl py-8 text-center">
          <p className="text-sm text-(--fg3)">暂无碎语</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <MomentFilterBar
        activeTab={activeTab}
        onTabChange={changeTab}
        activeSort={activeSort}
        onSortChange={changeSort}
      />

      {isLoadingInitial ? (
        <MomentMasonrySkeleton columnCount={columnCount} />
      ) : (
        <>
          <div className="flex gap-[14px]">
            {columnItems.map((col, colIdx) => (
              <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-[14px]">
                {col.map(({ moment, delay }, idx) => (
                  <div
                    key={moment.id}
                    className="animate-[momentCardEnter_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
                    style={{ animationDelay: `${delay}s` }}
                  >
                    <MomentCard
                      moment={moment}
                      priority={idx === 0}
                      onLike={toggleLike}
                      likeDisabled={pendingLikeIds.has(moment.id)}
                      onComment={openComment}
                      onEdit={openEdit}
                      onToggleTop={toggleTop}
                      onDelete={deleteMoment}
                      actionDisabled={pendingActionIds.has(moment.id)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {isLoadingMore && <MomentScrollLoader />}
          {endReached && !isLoadingMore && <MomentEndReached />}

          {showSentinel && <div ref={sentinelRef} className="h-px" />}

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
