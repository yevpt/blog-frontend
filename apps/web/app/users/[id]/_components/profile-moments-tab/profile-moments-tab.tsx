"use client";

import { useCallback, useEffect } from "react";
import type { MomentItemResp } from "@repo/api";
import { useMomentList } from "@/hooks/use-moment-list";
import { useMomentModal } from "@/store/use-moment-modal";
import { useCommentModal } from "@/store/use-comment-modal";
import { ProfileTabCompactSkeleton } from "../profile-tab-compact-skeleton";
import { ProfileTabEmptyState } from "../profile-tab-empty-state";
import { EMPTY_MOMENTS_PAGE, shouldShowProfileMomentsEndMessage } from "./constants";
import { ProfileMomentsVirtualList } from "./profile-moments-virtual-list";

interface ProfileMomentsTabProps {
  userId: number;
  isOwner: boolean;
  onTotalChange?: (total: number) => void;
}

/** 个人页碎语 Tab：embedded MomentCard + Virtuoso 无限滚动 */
export function ProfileMomentsTab({ userId, isOwner, onTotalChange }: ProfileMomentsTabProps) {
  const {
    moments,
    pageData,
    isLoadingInitial,
    isLoadingMore,
    endReached,
    fetchError,
    pendingLikeIds,
    pendingActionIds,
    loadMore,
    toggleLike,
    updateMoment,
    toggleTop,
    deleteMoment,
    setMoments,
  } = useMomentList({
    initialPage: EMPTY_MOMENTS_PAGE,
    mode: "user",
    userId,
  });
  const openMomentModal = useMomentModal((state) => state.open);
  const { open: openCommentModal } = useCommentModal();

  useEffect(() => {
    if (!isLoadingInitial) {
      onTotalChange?.(pageData.total);
    }
  }, [isLoadingInitial, onTotalChange, pageData.total]);

  const handleCommentAdded = useCallback(
    (momentId: number) => {
      setMoments((current) =>
        current.map((item) =>
          item.id === momentId ? { ...item, comment_count: item.comment_count + 1 } : item,
        ),
      );
    },
    [setMoments],
  );

  const openComment = useCallback(
    (moment: MomentItemResp) => {
      openCommentModal("moment", moment.id, () => handleCommentAdded(moment.id));
    },
    [openCommentModal, handleCommentAdded],
  );

  const openEdit = useCallback(
    (moment: MomentItemResp) => {
      openMomentModal(moment, (content, images) => updateMoment(moment, content, images));
    },
    [openMomentModal, updateMoment],
  );

  const isPendingInitial =
    isLoadingInitial || (pageData.total > 0 && moments.length === 0 && !fetchError);

  if (isPendingInitial) {
    return <ProfileTabCompactSkeleton testId="profile-moments-skeleton" />;
  }

  if (moments.length === 0) {
    return (
      <ProfileTabEmptyState
        icon="message-circle"
        iconClassName="text-sky-500"
        iconBgClassName="bg-gradient-to-br from-sky-500/15 to-sky-500/5"
        title="暂无碎语"
        description={isOwner ? "你还没有发布过碎语，去分享生活的碎片吧" : "TA 还没有发布过碎语"}
      />
    );
  }

  return (
    <div className="flex flex-col px-3 pb-3">
      <ProfileMomentsVirtualList
        items={moments}
        hasMore={!endReached}
        loading={isLoadingMore}
        fetchError={fetchError}
        showEndMessage={shouldShowProfileMomentsEndMessage(
          moments.length,
          !endReached,
          pageData.page,
          pageData.page_size,
        )}
        pendingLikeIds={pendingLikeIds}
        pendingActionIds={pendingActionIds}
        onLoadMore={loadMore}
        onLike={toggleLike}
        onComment={openComment}
        onEdit={openEdit}
        onToggleTop={toggleTop}
        onDelete={deleteMoment}
      />
    </div>
  );
}
