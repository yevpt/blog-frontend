"use client";

import { useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import type { UserLikedContentItemResp } from "@repo/api";
import { Button } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { MomentEndReached, MomentScrollLoader } from "@/components/moments/moment-scroll-loader";
import { LikedContentCard } from "./liked-content-card";

const ESTIMATED_ITEM_HEIGHT = 148;

interface ProfileLikesVirtualListProps {
  items: UserLikedContentItemResp[];
  hasMore: boolean;
  loading: boolean;
  fetchError: boolean;
  onLoadMore: () => void;
  onRetryLoadMore: () => void;
}

export function ProfileLikesVirtualList({
  items,
  hasMore,
  loading,
  fetchError,
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
    if (!hasMore) {
      return <MomentEndReached />;
    }
    return null;
  }, [fetchError, hasMore, loading, onRetryLoadMore]);

  const renderItem = useCallback(
    (_index: number, item: UserLikedContentItemResp) => (
      <div className="border-b border-border/40 last:border-b-0" data-testid="profile-liked-item">
        <LikedContentCard item={item} />
      </div>
    ),
    [],
  );

  return (
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
  );
}
