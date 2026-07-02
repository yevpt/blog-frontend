"use client";

import { memo, useCallback, useState } from "react";
import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { cn, Button } from "@repo/ui";
import {
  CommentReplies,
  getThreadDisplayName,
  ThreadCommentContent,
  ThreadCommentHeader,
  ThreadReplyIndent,
} from "@/components/comments";
import { InlineReplyEditor } from "@/components/comments/inputs/inline-reply-editor";
import { ReplyBanner } from "@/components/comments/inputs/reply-banner";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { normalizeModerationView } from "@/components/moderation";

interface GuestbookItemProps {
  item: GuestbookItemResp;
  onSubmitReply?: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  onLike?: (id: number) => void;
  currentUserId?: number | null;
  onDelete?: (id: number) => Promise<boolean>;
  onDeleteReply?: (itemId: number, replyId: number) => Promise<boolean>;
  pendingReply?: CommentReplyResp | null;
  /** 作者编辑回调；返回 true 表示已按 ID 原位替换。 */
  onEdit?: (id: number, content: string) => Promise<boolean>;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  editedReply?: CommentReplyResp | null;
}

const NOOP_SUBMIT_REPLY = async () => false;

export const GuestbookItem = memo(function GuestbookItem({
  item,
  onSubmitReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  pendingReply,
  onEdit,
  onSubmitEditReply,
  editedReply,
}: GuestbookItemProps) {
  const displayName = getThreadDisplayName(item.user);
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 所有互动判断先经规范化，审核关闭/旧响应缺失时回退为充分可交互的可见旧版本
  const moderation = normalizeModerationView(item.moderation);
  const canInteract = moderation.can_interact;
  const hasReplies = item.reply_count > 0;
  // 作者的删除/编辑入口不由前端审核状态擅自移除
  const isOwnItem = currentUserId != null && currentUserId === item.from_user_id;

  const handleLike = useCallback(() => {
    if (!canInteract) return;
    onLike?.(item.id);
  }, [canInteract, onLike, item.id]);

  const handleReply = useCallback(() => {
    if (!canInteract) return;
    if (!userId) {
      openLoginModal();
      return;
    }
    setIsEditing(false);
    setIsReplying(true);
  }, [canInteract, userId, openLoginModal]);

  const handleDelete = useCallback(() => onDelete?.(item.id) ?? false, [onDelete, item.id]);
  const handleDeleteReply = useCallback(
    (replyId: number) => onDeleteReply?.(item.id, replyId) ?? Promise.resolve(false),
    [onDeleteReply, item.id],
  );

  const handleOpenEditor = useCallback(() => {
    setIsReplying(false);
    setIsEditing(true);
  }, []);

  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(item.id, undefined, content)) ?? false;
      if (ok) setIsReplying(false);
      return ok;
    },
    [onSubmitReply, item.id],
  );

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok = (await onEdit?.(item.id, content)) ?? false;
      if (ok) setIsEditing(false);
      return ok;
    },
    [onEdit, item.id],
  );

  // 中风险编辑：作者看到的是待审新版本，便于在其基础上修订或撤销
  const editInitialContent = item.moderation?.pending_content ?? item.content;

  return (
    <div className={cn("pt-4", hasReplies ? "pb-5" : "pb-2")}>
      <ThreadCommentHeader
        user={item.user}
        createdAt={item.created_at}
        likeCount={item.like_count}
        isLiked={item.is_liked}
        onLike={handleLike}
        onReply={onSubmitReply && canInteract ? handleReply : undefined}
        onDelete={isOwnItem && onDelete ? handleDelete : undefined}
        deleteLabel="删除留言"
        deleteConfirmMessage="确定删除这条留言吗？"
        linkProfile
        moderation={item.moderation}
      />

      {isOwnItem && onEdit && !isEditing && (
        <div className="mb-2">
          <Button
            variant="text"
            aria-label="编辑留言"
            onPress={handleOpenEditor}
            className="h-auto min-h-0 p-0 text-xs leading-none font-medium text-(--fg3) transition-colors hover:text-foreground"
          >
            编辑
          </Button>
        </div>
      )}

      {isEditing ? (
        <InlineReplyEditor
          initialValue={editInitialContent}
          placeholder="编辑留言正文…"
          header={<ReplyBanner toUsername="编辑中" onCancel={() => setIsEditing(false)} editing />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
          className="mb-4"
        />
      ) : (
        <ThreadCommentContent
          content={item.content}
          moderation={item.moderation}
          isOwner={isOwnItem}
          className={cn(hasReplies && (repliesOpen ? "mb-6" : "mb-4"))}
        />
      )}

      {isReplying && (
        <InlineReplyEditor
          placeholder={`回复 @${displayName}…`}
          header={<ReplyBanner toUsername={displayName} onCancel={() => setIsReplying(false)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
          className="mb-4"
        />
      )}

      {hasReplies && (
        <ThreadReplyIndent>
          <CommentReplies
            commentId={item.id}
            targetType="guestbook"
            replyCount={item.reply_count}
            pendingReply={pendingReply}
            editedReply={editedReply}
            onSubmitReply={onSubmitReply ?? NOOP_SUBMIT_REPLY}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onSubmitEditReply={onSubmitEditReply}
            onOpenChange={setRepliesOpen}
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
});
