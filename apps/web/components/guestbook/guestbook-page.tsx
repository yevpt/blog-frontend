"use client";

import { useState, useCallback } from "react";
import type { CommentReplyResp, GuestbookPageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useGuestbookList } from "@/hooks/use-guestbook-list";
import { useGuestbookSubmit } from "@/hooks/use-guestbook-submit";
import { useGuestbookLike } from "@/hooks/use-guestbook-like";
import { useGuestbookDelete } from "@/hooks/use-guestbook-delete";
import { GuestbookList } from "./guestbook-list";
import { GuestbookInputBar } from "./guestbook-input-bar";
import type { ReplyTarget } from "@/components/comments";
import { PageContainer } from "@/components/common/page-container";

interface GuestbookPageProps {
  initialPage: GuestbookPageResp;
}

export function GuestbookPage({ initialPage }: GuestbookPageProps) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const {
    items,
    page,
    totalPages,
    total,
    isLoading,
    error,
    fetchPage,
    addItem,
    incrementReplyCount,
    decrementReplyCount,
    removeItem,
    updateLike,
  } = useGuestbookList(initialPage);

  const { isSubmitting, submitEntry, submitReply } = useGuestbookSubmit();

  const { toggleEntryLike } = useGuestbookLike();
  const { deleteItem, deleteReply } = useGuestbookDelete();

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});

  const handleSubmit = useCallback(
    async (content: string): Promise<boolean> => {
      if (replyTarget) {
        const reply = await submitReply(replyTarget.commentId, content, replyTarget.parentReplyId);
        if (reply) {
          incrementReplyCount(replyTarget.commentId);
          setPendingReplies((prev) => ({ ...prev, [replyTarget.commentId]: reply }));
          setReplyTarget(null);
          return true;
        }
        return false;
      }
      const item = await submitEntry(content);
      if (item) {
        addItem(item);
        return true;
      }
      return false;
    },
    [replyTarget, submitReply, submitEntry, incrementReplyCount, addItem],
  );

  const handleLike = useCallback(
    async (id: number) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      const result = await toggleEntryLike(id);
      if (result) updateLike(id, result.is_liked, result.like_count);
    },
    [userId, openLoginModal, toggleEntryLike, updateLike],
  );

  const handleReply = useCallback(
    (target: ReplyTarget) => {
      if (!userId) {
        openLoginModal();
        return;
      }
      setReplyTarget(target);
    },
    [userId, openLoginModal],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      const ok = await deleteItem(id);
      if (ok) {
        removeItem(id);
      }
      return ok;
    },
    [deleteItem, removeItem],
  );

  const handleReplyDelete = useCallback(
    async (itemId: number, replyId: number) => {
      const ok = await deleteReply(replyId);
      if (ok) {
        decrementReplyCount(itemId);
      }
      return ok;
    },
    [decrementReplyCount, deleteReply],
  );

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  return (
    <PageContainer size="default" className="min-h-dvh">
      <div className="mb-6">
        <GuestbookInputBar
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          replyTarget={replyTarget}
          onCancelReply={handleCancelReply}
        />
      </div>
      <GuestbookList
        items={items}
        page={page}
        totalPages={totalPages}
        total={total}
        isLoading={isLoading}
        error={error}
        onPageChange={fetchPage}
        onReply={handleReply}
        onLike={handleLike}
        currentUserId={userId}
        onDelete={handleDelete}
        onDeleteReply={handleReplyDelete}
        pendingReplies={pendingReplies}
      />
    </PageContainer>
  );
}
