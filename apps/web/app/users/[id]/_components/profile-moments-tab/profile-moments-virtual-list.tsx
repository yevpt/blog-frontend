"use client";

import { useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import type { MomentItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import { MomentCard } from "@/components/moments/moment-card";
import { MomentScrollLoader } from "@/components/moments/moment-scroll-loader";

/** 碎语卡片高度不一（有无图片、长短文），给 Virtuoso 一个接近均值的估算高度 */
const ESTIMATED_ITEM_HEIGHT = 168;

interface ProfileMomentsVirtualListProps {
  items: MomentItemResp[];
  hasMore: boolean;
  loading: boolean;
  fetchError: boolean;
  showEndMessage: boolean;
  pendingLikeIds: ReadonlySet<number>;
  pendingActionIds: ReadonlySet<number>;
  onLoadMore: () => void;
  onLike: (moment: MomentItemResp) => void;
  onComment: (moment: MomentItemResp) => void;
  onEdit: (moment: MomentItemResp) => void;
  onToggleTop: (moment: MomentItemResp) => void;
  onDelete: (moment: MomentItemResp) => Promise<void> | void;
}

export function ProfileMomentsVirtualList({
  items,
  hasMore,
  loading,
  fetchError,
  showEndMessage,
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
      return <MomentScrollLoader />;
    }
    return null;
  }, [loading]);

  const renderItem = useCallback(
    (index: number, moment: MomentItemResp) => {
      const isLastItem = index === items.length - 1;
      // 无「已经到底了」且列表已静默结束时，最后一条不画底部分割线
      const hideLastBorder = isLastItem && !showEndMessage && !hasMore && !loading;

      return (
        <div
          className={cn("border-border/40", !hideLastBorder && "border-b")}
          data-testid="profile-moment-item"
        >
          <MomentCard
            moment={moment}
            layout="embedded"
            priority={index === 0}
            onLike={onLike}
            likeDisabled={pendingLikeIds.has(moment.id)}
            onComment={onComment}
            onEdit={onEdit}
            onToggleTop={onToggleTop}
            onDelete={onDelete}
            actionDisabled={pendingActionIds.has(moment.id)}
          />
        </div>
      );
    },
    [
      hasMore,
      items.length,
      loading,
      pendingActionIds,
      pendingLikeIds,
      onComment,
      onDelete,
      onEdit,
      onLike,
      onToggleTop,
      showEndMessage,
    ],
  );

  return (
    <>
      <Virtuoso
        useWindowScroll
        data={items}
        computeItemKey={(_, moment) => moment.id}
        endReached={handleEndReached}
        overscan={320}
        defaultItemHeight={ESTIMATED_ITEM_HEIGHT}
        increaseViewportBy={{ top: 240, bottom: 480 }}
        components={{ Footer: ListFooter }}
        itemContent={renderItem}
      />
      {showEndMessage ? (
        <p
          data-testid="profile-moments-end-hint"
          className="pt-3 pb-1 text-center text-xs text-muted-foreground"
        >
          已经到底了
        </p>
      ) : null}
      {fetchError && !loading && (
        <p className="py-3 text-center text-sm text-muted-foreground">加载失败，请稍后重试</p>
      )}
    </>
  );
}
