"use client";

import { useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import type { NotificationItemResp } from "@repo/api";
import { MomentEndReached, MomentScrollLoader } from "@/components/moments/moment-scroll-loader";
import NotificationCard from "./notification-card";
import { NotificationCardMotion } from "./notification-card-motion";

/** 通知卡片高度不一，给 Virtuoso 一个接近均值的估算高度 */
const ESTIMATED_ITEM_HEIGHT = 124;

interface NotificationVirtualListProps {
  items: NotificationItemResp[];
  enteringIds: ReadonlySet<number>;
  staggerAnimateIds: ReadonlySet<number>;
  selecting: boolean;
  selected: ReadonlySet<number>;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onOpen: (item: NotificationItemResp) => void;
  onRead: (id: number) => void;
  onToggleSelect: (id: number) => void;
  onInlineLike: (item: NotificationItemResp) => void | Promise<void>;
  onInlineReplySubmit: (item: NotificationItemResp, content: string) => Promise<boolean>;
  replyingId: number | null;
}

export function NotificationVirtualList({
  items,
  enteringIds,
  staggerAnimateIds,
  selecting,
  selected,
  hasMore,
  loading,
  onLoadMore,
  onOpen,
  onRead,
  onToggleSelect,
  onInlineLike,
  onInlineReplySubmit,
  replyingId,
}: NotificationVirtualListProps) {
  const handleEndReached = useCallback(() => {
    if (loading || !hasMore) return;
    onLoadMore();
  }, [hasMore, loading, onLoadMore]);

  const ListFooter = useCallback(() => {
    if (loading) return <MomentScrollLoader />;
    if (!hasMore) return <MomentEndReached />;
    return null;
  }, [hasMore, loading]);

  const renderItem = useCallback(
    (index: number, item: NotificationItemResp) => (
      <div className="pb-2">
        <NotificationCardMotion
          staggerIndex={index}
          entering={enteringIds.has(item.id)}
          staggerAnimate={staggerAnimateIds.has(item.id)}
        >
          <NotificationCard
            item={item}
            selecting={selecting}
            selected={selected.has(item.id)}
            onOpen={onOpen}
            onRead={onRead}
            onToggleSelect={onToggleSelect}
            onInlineLike={onInlineLike}
            onInlineReplySubmit={onInlineReplySubmit}
            isReplySubmitting={replyingId === item.id}
          />
        </NotificationCardMotion>
      </div>
    ),
    [
      enteringIds,
      staggerAnimateIds,
      selecting,
      selected,
      replyingId,
      onOpen,
      onRead,
      onToggleSelect,
      onInlineLike,
      onInlineReplySubmit,
    ],
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
