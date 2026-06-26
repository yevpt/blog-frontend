"use client";

import { useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import type { UserLikedContentItemResp } from "@repo/api";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { MomentScrollLoader } from "@/components/moments/moment-scroll-loader";
import { LikedContentCard } from "./liked-content-card";

const ESTIMATED_ITEM_HEIGHT = 148;

interface ProfileLikesVirtualListProps {
  items: UserLikedContentItemResp[];
  hasMore: boolean;
  loading: boolean;
  fetchError: boolean;
  showEndMessage: boolean;
  onLoadMore: () => void;
  onRetryLoadMore: () => void;
}

export function ProfileLikesVirtualList({
  items,
  hasMore,
  loading,
  fetchError,
  showEndMessage,
  onLoadMore,
  onRetryLoadMore,
}: ProfileLikesVirtualListProps) {
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
    if (fetchError) {
      return (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <p className="text-sm text-muted-foreground">加载失败，请稍后重试</p>
          <Button
            type="button"
            variant={null}
            size={null}
            onPress={onRetryLoadMore}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            <SvgIcon name="refresh-cw" size={15} />
            重试
          </Button>
        </div>
      );
    }
    return null;
  }, [fetchError, loading, onRetryLoadMore]);

  const renderItem = useCallback(
    (index: number, item: UserLikedContentItemResp) => {
      const isLastItem = index === items.length - 1;
      const hideLastBorder = isLastItem && !showEndMessage && !hasMore && !loading;

      return (
        <div
          className={cn("border-border/40", !hideLastBorder && "border-b")}
          data-testid="profile-liked-item"
        >
          <LikedContentCard item={item} />
        </div>
      );
    },
    [hasMore, items.length, loading, showEndMessage],
  );

  return (
    <>
      <Virtuoso
        useWindowScroll
        data={items}
        computeItemKey={(_, item) => item.id}
        endReached={handleEndReached}
        overscan={320}
        defaultItemHeight={ESTIMATED_ITEM_HEIGHT}
        increaseViewportBy={{ top: 240, bottom: 480 }}
        components={{ Footer: ListFooter }}
        itemContent={renderItem}
      />
      {showEndMessage ? (
        <p
          data-testid="profile-likes-end-hint"
          className="pt-3 pb-1 text-center text-xs text-muted-foreground"
        >
          已经到底了
        </p>
      ) : null}
    </>
  );
}
