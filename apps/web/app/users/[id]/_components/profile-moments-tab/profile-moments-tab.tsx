"use client";

import { useCallback, useEffect, useState } from "react";
import type { MomentItemResp, MomentPageResp } from "@repo/api";
import dynamic from "next/dynamic";
import { useMomentList } from "@/hooks/use-moment-list";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { ProfileTabEmptyState } from "../profile-tab-empty-state";
import { ProfileMomentsVirtualList } from "./profile-moments-virtual-list";

const CommentModal = dynamic(() => import("@/components/comments").then((m) => m.CommentModal), {
  ssr: false,
});

interface ProfileMomentsTabProps {
  userId: number;
  isOwner: boolean;
  initialPage: MomentPageResp;
  onTotalChange?: (total: number) => void;
}

/** 个人页碎语 Tab：embedded SnippetCard + Virtuoso 无限滚动 */
export function ProfileMomentsTab({
  userId,
  isOwner,
  initialPage,
  onTotalChange,
}: ProfileMomentsTabProps) {
  const {
    moments,
    pageData,
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
    initialPage,
    ownerUserId: userId,
    initialTab: "owner",
  });
  const openSnippetModal = useSnippetModal((state) => state.open);
  const [activeComment, setActiveComment] = useState<{ momentId: number } | null>(null);

  useEffect(() => {
    onTotalChange?.(pageData.total);
  }, [onTotalChange, pageData.total]);

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
    <>
      <div className="flex flex-col px-3 pb-3">
        <ProfileMomentsVirtualList
          items={moments}
          hasMore={!endReached}
          loading={isLoadingMore}
          fetchError={fetchError}
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
