"use client";

import { useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import type { MomentItemResp } from "@repo/api";
import { SnippetCard } from "@/components/snippets/snippet-card";
import {
  SnippetEndReached,
  SnippetScrollLoader,
} from "@/components/snippets/snippet-scroll-loader";

/** 碎语卡片高度不一（有无图片、长短文），给 Virtuoso 一个接近均值的估算高度 */
const ESTIMATED_ITEM_HEIGHT = 168;

interface ProfileMomentsVirtualListProps {
  items: MomentItemResp[];
  hasMore: boolean;
  loading: boolean;
  fetchError: boolean;
  pendingLikeIds: ReadonlySet<number>;
  pendingActionIds: ReadonlySet<number>;
  onLoadMore: () => void;
  onLike: (snippet: MomentItemResp) => void;
  onComment: (snippet: MomentItemResp) => void;
  onEdit: (snippet: MomentItemResp) => void;
  onToggleTop: (snippet: MomentItemResp) => void;
  onDelete: (snippet: MomentItemResp) => Promise<void> | void;
}

export function ProfileMomentsVirtualList({
  items,
  hasMore,
  loading,
  fetchError,
  pendingLikeIds,
  pendingActionIds,
  onLoadMore,
  onLike,
  onComment,
  onEdit,
  onToggleTop,
  onDelete,
}: ProfileMomentsVirtualListProps) {
  const handleEndReached = useCallback(() => {
    if (loading || !hasMore) {
      return;
    }
    onLoadMore();
  }, [hasMore, loading, onLoadMore]);

  const ListFooter = useCallback(() => {
    if (loading) {
      return <SnippetScrollLoader />;
    }
    if (!hasMore) {
      return <SnippetEndReached />;
    }
    return null;
  }, [hasMore, loading]);

  const renderItem = useCallback(
    (index: number, snippet: MomentItemResp) => (
      // Virtuoso 每项独立容器，embedded 的 last:border-b-0 会误删分割线，外层补 border-b
      <div className="border-b border-border/40" data-testid="profile-moment-item">
        <SnippetCard
          snippet={snippet}
          layout="embedded"
          priority={index === 0}
          onLike={onLike}
          likeDisabled={pendingLikeIds.has(snippet.id)}
          onComment={onComment}
          onEdit={onEdit}
          onToggleTop={onToggleTop}
          onDelete={onDelete}
          actionDisabled={pendingActionIds.has(snippet.id)}
        />
      </div>
    ),
    [pendingActionIds, pendingLikeIds, onComment, onDelete, onEdit, onLike, onToggleTop],
  );

  return (
    <>
      <Virtuoso
        useWindowScroll
        data={items}
        computeItemKey={(_, snippet) => snippet.id}
        endReached={handleEndReached}
        overscan={320}
        defaultItemHeight={ESTIMATED_ITEM_HEIGHT}
        increaseViewportBy={{ top: 240, bottom: 480 }}
        components={{ Footer: ListFooter }}
        itemContent={renderItem}
      />
      {fetchError && !loading && (
        <p className="py-3 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
      )}
    </>
  );
}
