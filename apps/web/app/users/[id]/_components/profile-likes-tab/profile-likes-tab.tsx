"use client";

import { useEffect } from "react";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useUserLikedContent } from "@/hooks/use-user-liked-content";
import { ProfileTabCompactSkeleton } from "../profile-tab-compact-skeleton";
import { ProfileTabEmptyState } from "../profile-tab-empty-state";
import { LIKED_CONTENT_FILTERS } from "./liked-content-format";
import { shouldShowProfileLikesEndMessage } from "./constants";
import { ProfileLikesVirtualList } from "./profile-likes-virtual-list";

interface ProfileLikesTabProps {
  userId: number;
  isOwner: boolean;
  likesCount: number;
  onCountChange?: (count: number) => void;
}

function ProfileLikesFilterBar({
  activeFilter,
  onChange,
  disabled,
}: {
  activeFilter: string;
  onChange: (value: (typeof LIKED_CONTENT_FILTERS)[number]["value"]) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="mb-2 flex gap-2 overflow-x-auto px-0 pb-3 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="点赞内容筛选"
    >
      {LIKED_CONTENT_FILTERS.map((option) => {
        const active = option.value === activeFilter;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
              active
                ? "border border-transparent bg-muted text-foreground"
                : "border border-border bg-transparent text-foreground hover:bg-muted/60",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** 个人页点赞 Tab：筛选 + Virtuoso 无限滚动 */
export function ProfileLikesTab({
  userId,
  isOwner,
  likesCount,
  onCountChange,
}: ProfileLikesTabProps) {
  const {
    filter,
    items,
    pageData,
    isLoadingInitial,
    isLoadingMore,
    endReached,
    initialError,
    fetchError,
    changeFilter,
    loadMore,
    retryInitial,
    retryLoadMore,
  } = useUserLikedContent({ userId });

  // 仅在「全部」筛选且首屏已加载后同步 Tab 计数：
  // 挂载时 pageData 为 EMPTY（total=0），若立即回写会覆盖 SSR 计数导致 Tab 标签抖动。
  useEffect(() => {
    if (filter === "all" && !isLoadingInitial) {
      onCountChange?.(pageData.total);
    }
  }, [filter, isLoadingInitial, onCountChange, pageData.total]);

  const showEmpty = !isLoadingInitial && !initialError && items.length === 0;

  const showFilterBar = likesCount > 0;

  return (
    <div className="flex flex-col px-3 pb-3" data-testid="profile-likes-tab">
      {showFilterBar ? (
        <ProfileLikesFilterBar
          activeFilter={filter}
          onChange={changeFilter}
          disabled={isLoadingInitial}
        />
      ) : null}

      {isLoadingInitial ? (
        <ProfileTabCompactSkeleton testId="profile-likes-skeleton" />
      ) : initialError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <p className="text-sm">加载失败，请稍后重试</p>
          <Button
            type="button"
            variant={null}
            size={null}
            onPress={retryInitial}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            <SvgIcon name="refresh-cw" size={15} />
            重试
          </Button>
        </div>
      ) : showEmpty ? (
        <ProfileTabEmptyState
          icon="heart-fill"
          iconClassName="text-rose-500"
          iconBgClassName="bg-gradient-to-br from-rose-500/15 to-rose-500/5"
          title="暂无点赞"
          description={isOwner ? "你还没有点赞过任何内容" : "TA 还没有点赞过任何内容"}
        />
      ) : (
        <ProfileLikesVirtualList
          items={items}
          hasMore={!endReached}
          loading={isLoadingMore}
          fetchError={fetchError}
          showEndMessage={shouldShowProfileLikesEndMessage(
            items.length,
            !endReached,
            pageData.page,
            pageData.page_size,
          )}
          onLoadMore={loadMore}
          onRetryLoadMore={retryLoadMore}
        />
      )}
    </div>
  );
}
