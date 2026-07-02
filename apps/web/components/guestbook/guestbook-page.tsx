"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CommentReplyResp, GuestbookPageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useGuestbookList } from "@/hooks/use-guestbook-list";
import { useGuestbookSubmit } from "@/hooks/use-guestbook-submit";
import { useGuestbookLike } from "@/hooks/use-guestbook-like";
import { useGuestbookDelete } from "@/hooks/use-guestbook-delete";
import { useCommentEdit } from "@/hooks/use-comment-edit";
import { GuestbookList } from "./guestbook-list";
import { GuestbookInputBar } from "./guestbook-input-bar";
import { PageContainer } from "@/components/common/page-container";
import { enrichGuestbookAuthor, enrichReplyFromAuthor } from "@/lib/enrich-ugc-author";
import { scrollIntoViewBelowFixedHeader } from "@/lib/scroll-into-view";

interface GuestbookPageProps {
  initialPage: GuestbookPageResp;
}

export function GuestbookPage({ initialPage }: GuestbookPageProps) {
  const { userId, profile } = useSession();
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
    replaceItem,
  } = useGuestbookList(initialPage);

  const { isSubmitting, submitEntry, submitReply, editEntry } = useGuestbookSubmit();
  const { editReply } = useCommentEdit("guestbook");

  const { toggleEntryLike } = useGuestbookLike();
  const { deleteItem, deleteReply } = useGuestbookDelete();

  const listRef = useRef<HTMLDivElement>(null);
  const pendingPaginationScrollRef = useRef(false);
  const wasLoadingRef = useRef(false);
  const [pendingReplies, setPendingReplies] = useState<Record<number, CommentReplyResp | null>>({});
  const [editedReplies, setEditedReplies] = useState<Record<number, CommentReplyResp | null>>({});

  const handleSubmitEntry = useCallback(
    async (content: string): Promise<boolean> => {
      const item = await submitEntry(content);
      if (item) {
        addItem(enrichGuestbookAuthor(item, userId, profile));
        return true;
      }
      return false;
    },
    [addItem, profile, submitEntry, userId],
  );

  const handleReplySubmit = useCallback(
    async (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const reply = await submitReply(commentId, trimmed, parentReplyId);
      if (!reply) return false;
      incrementReplyCount(commentId);
      setPendingReplies((current) => ({
        ...current,
        [commentId]: enrichReplyFromAuthor(reply, userId, profile),
      }));
      return true;
    },
    [incrementReplyCount, profile, submitReply, userId],
  );

  const handleEditReplySubmit = useCallback(
    async (
      replyId: number,
      parentReplyId: number,
      commentId: number,
      content: string,
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const reply = await editReply(replyId, parentReplyId, trimmed);
      if (!reply) return false;
      setEditedReplies((current) => ({
        ...current,
        [commentId]: enrichReplyFromAuthor(reply, userId, profile),
      }));
      return true;
    },
    [editReply, profile, userId],
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

  const handleEdit = useCallback(
    async (id: number, content: string): Promise<boolean> => {
      const item = await editEntry(id, content);
      if (item) {
        replaceItem(enrichGuestbookAuthor(item, userId, profile));
        return true;
      }
      return false;
    },
    [editEntry, profile, replaceItem, userId],
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

  const handlePageChange = useCallback(
    (pageNum: number) => {
      pendingPaginationScrollRef.current = true;
      void fetchPage(pageNum);
    },
    [fetchPage],
  );

  // 分页加载完成后，滚到留言列表顶部（避开 fixed 顶栏）
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && pendingPaginationScrollRef.current) {
      pendingPaginationScrollRef.current = false;
      const el = listRef.current;
      if (el) {
        scrollIntoViewBelowFixedHeader(el);
      }
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  return (
    <PageContainer size="default" className="min-h-dvh">
      <div className="mb-6">
        <GuestbookInputBar onSubmit={handleSubmitEntry} isSubmitting={isSubmitting} />
      </div>
      <GuestbookList
        items={items}
        page={page}
        totalPages={totalPages}
        total={total}
        isLoading={isLoading}
        error={error}
        onPageChange={handlePageChange}
        onSubmitReply={handleReplySubmit}
        listRef={listRef}
        onLike={handleLike}
        currentUserId={userId}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onDeleteReply={handleReplyDelete}
        onSubmitEditReply={handleEditReplySubmit}
        pendingReplies={pendingReplies}
        editedReplies={editedReplies}
      />
    </PageContainer>
  );
}
