"use client";

import { useEffect } from "react";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useUserLikedContent } from "@/hooks/use-user-liked-content";
import { ProfileTabEmptyState } from "../profile-tab-empty-state";
import { PROFILE_LIKES_SKELETON_COUNT } from "./constants";
import { LIKED_CONTENT_FILTERS } from "./liked-content-format";
import { ProfileLikesVirtualList } from "./profile-likes-virtual-list";

interface ProfileLikesTabProps {
  userId: number;
  isOwner: boolean;
  likesCount: number;
  onCountChange?: (count: number) => void;
}

function ProfileLikesSkeletonList() {
  return (
    <div className="space-y-0" data-testid="profile-likes-skeleton">
      {Array.from({ length: PROFILE_LIKES_SKELETON_COUNT }, (_, index) => (
        <div key={index} className="border-b border-border/40 py-3.5 last:border-b-0">
          <div className="flex animate-pulse gap-3">
            <div className="size-9 shrink-0 rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-3 w-12 rounded bg-muted" />
              </div>
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-4/5 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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

  // 仅在「全部」筛选下同步 Tab 计数，避免子筛选的 total 覆盖全量点赞数
  useEffect(() => {
    if (filter === "all") {
      onCountChange?.(pageData.total);
    }
  }, [filter, onCountChange, pageData.total]);

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
        <ProfileLikesSkeletonList />
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
          onLoadMore={loadMore}
          onRetryLoadMore={retryLoadMore}
        />
      )}
    </div>
  );
}
