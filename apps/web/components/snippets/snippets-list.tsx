"use client";

import { useCallback, useState } from "react";
import { Pagination } from "@repo/ui";
import type { MomentPageResp } from "@repo/api";
import { CommentModal } from "@/components/comments";
import { useMomentEngagement } from "@/hooks/use-moment-engagement";
import { SnippetCard } from "./snippet-card";
import { SnippetCardSkeleton } from "./snippet-card-skeleton";

interface SnippetsListProps {
  initialPage: MomentPageResp;
  ownerUserId?: number;
}

export function SnippetsList({ initialPage, ownerUserId }: SnippetsListProps) {
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [pageData, setPageData] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

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
    ownerUserId,
    getRefreshParams,
    onRefresh: setPageData,
  });

  const fetchPage = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setFetchError(false);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageData.page_size),
        });
        if (ownerUserId !== undefined) {
          params.set("user_id", String(ownerUserId));
        }
        const res = await fetch(`/api/moments?${params.toString()}`);
        if (!res.ok) throw new Error("fetch failed");
        const data: MomentPageResp = await res.json();
        setPageData(data);
        setMoments(data.list);
        setCurrentPage(page);
      } catch {
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [ownerUserId, pageData.page_size, setMoments],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      void fetchPage(page);
    },
    [fetchPage],
  );

  const skeletonCount = pageData.list.length || pageData.page_size;

  if (moments.length === 0 && !isLoading) {
    return (
      <p className="rounded-2xl border border-border bg-card py-8 text-center text-sm text-(--fg3)">
        暂无碎语
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card px-3 py-2">
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, i) => <SnippetCardSkeleton key={i} />)
          : moments.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                onLike={handleLike}
                likeDisabled={pendingLikeIds.includes(snippet.id)}
                onComment={openComment}
              />
            ))}
      </div>

      {fetchError && (
        <p className="mt-4 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
      )}

      {pageData.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pageData.pages}
          onPageChange={handlePageChange}
          className="mt-8"
        />
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
