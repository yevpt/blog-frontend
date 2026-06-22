"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MomentPageResp, MomentItemResp } from "@repo/api";
import dynamic from "next/dynamic";
import { useMomentList } from "@/hooks/use-moment-list";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { Card } from "@repo/ui";
import { SnippetCard } from "./snippet-card";
import { SnippetCardSkeleton } from "./snippet-card-skeleton";
import { SnippetFilterBar } from "./snippet-filter-bar";
import { SnippetScrollLoader, SnippetEndReached } from "./snippet-scroll-loader";
import { distributeToColumns, getSnippetColumnCount } from "./snippet-masonry";

export { getSnippetColumnCount } from "./snippet-masonry";

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

function useColumnCount(): number {
  const [columns, setColumns] = useState(() => getSnippetColumnCount(window.innerWidth));

  useLayoutEffect(() => {
    const update = () => setColumns(getSnippetColumnCount(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}

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
 */
export function SnippetsList({ initialPage, ownerUserId, friendRoleId }: SnippetsListProps) {
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
  } = useMomentList({ initialPage, ownerUserId, friendRoleId });
  const openSnippetModal = useSnippetModal((state) => state.open);

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

  const openComment = useCallback((snippet: MomentItemResp) => {
    setActiveComment({ momentId: snippet.id });
  }, []);

  const openEdit = useCallback(
    (snippet: MomentItemResp) => {
      openSnippetModal(snippet, (content, images) => updateMoment(snippet, content, images));
    },
    [openSnippetModal, updateMoment],
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
        <SnippetFilterBar
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
      <SnippetFilterBar
        activeTab={activeTab}
        onTabChange={changeTab}
        activeSort={activeSort}
        onSortChange={changeSort}
      />

      {isLoadingInitial ? (
        <SnippetMasonrySkeleton columnCount={columnCount} />
      ) : (
        <>
          <div className="flex gap-[14px]">
            {columnItems.map((col, colIdx) => (
              <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-[14px]">
                {col.map(({ snippet, delay }, idx) => (
                  <div
                    key={snippet.id}
                    className="animate-[snippetCardEnter_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
                    style={{ animationDelay: `${delay}s` }}
                  >
                    <SnippetCard
                      snippet={snippet}
                      priority={idx === 0}
                      onLike={toggleLike}
                      likeDisabled={pendingLikeIds.has(snippet.id)}
                      onComment={openComment}
                      onEdit={openEdit}
                      onToggleTop={toggleTop}
                      onDelete={deleteMoment}
                      actionDisabled={pendingActionIds.has(snippet.id)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {isLoadingMore && <SnippetScrollLoader />}
          {endReached && !isLoadingMore && <SnippetEndReached />}

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
