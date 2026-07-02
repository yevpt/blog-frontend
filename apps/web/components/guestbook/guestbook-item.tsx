"use client";

import { memo, useCallback, useState } from "react";
import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import type { ReplyEditTarget } from "@/components/comments";
import { cn, Button } from "@repo/ui";
import {
  CommentReplies,
  RichCommentInput,
  getThreadDisplayName,
  ThreadCommentContent,
  ThreadCommentHeader,
  ThreadReplyIndent,
  type ReplyTarget,
} from "@/components/comments";
import { normalizeModerationView } from "@/components/moderation";

interface GuestbookItemProps {
  item: GuestbookItemResp;
  onReply?: (target: ReplyTarget) => void;
  onLike?: (id: number) => void;
  currentUserId?: number | null;
  onDelete?: (id: number) => Promise<boolean>;
  onDeleteReply?: (itemId: number, replyId: number) => Promise<boolean>;
  pendingReply?: CommentReplyResp | null;
  /** 作者编辑回调；返回 true 表示已按 ID 原位替换。 */
  onEdit?: (id: number, content: string) => Promise<boolean>;
  onEditReply?: (target: ReplyEditTarget) => void;
  editedReply?: CommentReplyResp | null;
}

export const GuestbookItem = memo(function GuestbookItem({
  item,
  onReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  pendingReply,
  onEdit,
  onEditReply,
  editedReply,
}: GuestbookItemProps) {
  const displayName = getThreadDisplayName(item.user);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editContent, setEditContent] = useState("");

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
    onReply?.({ commentId: item.id, toUsername: displayName });
  }, [canInteract, onReply, item.id, displayName]);

  const handleDelete = useCallback(() => onDelete?.(item.id) ?? false, [onDelete, item.id]);
  const handleDeleteReply = useCallback(
    (replyId: number) => onDeleteReply?.(item.id, replyId) ?? Promise.resolve(false),
    [onDeleteReply, item.id],
  );

  const handleOpenEditor = useCallback(() => {
    // 中风险编辑：作者看到的是待审新版本，便于在其基础上修订或撤销
    setEditContent(item.moderation?.pending_content ?? item.content);
    setIsEditing(true);
  }, [item.content, item.moderation]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent("");
  }, []);

  const handleSubmitEdit = useCallback(async () => {
    if (!onEdit) return;
    const trimmed = editContent.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    try {
      const ok = await onEdit(item.id, editContent);
      if (ok) {
        setIsEditing(false);
        setEditContent("");
      }
    } finally {
      setIsSaving(false);
    }
  }, [editContent, isSaving, item.id, onEdit]);

  return (
    <div className={cn("pt-4", hasReplies ? "pb-5" : "pb-2")}>
      <ThreadCommentHeader
        user={item.user}
        createdAt={item.created_at}
        likeCount={item.like_count}
        isLiked={item.is_liked}
        onLike={handleLike}
        onReply={onReply && canInteract ? handleReply : undefined}
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
        <GuestbookInlineEditor
          value={editContent}
          onChange={setEditContent}
          onSubmit={handleSubmitEdit}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
        />
      ) : (
        <ThreadCommentContent
          content={item.content}
          moderation={item.moderation}
          isOwner={isOwnItem}
          className={cn(hasReplies && (repliesOpen ? "mb-6" : "mb-4"))}
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
            onReply={onReply ?? (() => undefined)}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onEditReply={onEditReply}
            onOpenChange={setRepliesOpen}
            linkProfile
          />
        </ThreadReplyIndent>
      )}
    </div>
  );
});

interface GuestbookInlineEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

/** 留言作者内联编辑器，复用 RichCommentInput 以保持与发布一致的交互与外链策略。 */
function GuestbookInlineEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  isSaving,
}: GuestbookInlineEditorProps) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <RichCommentInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        isSubmitting={isSaving}
        placeholder="编辑留言正文…"
        maxLength={2000}
        header={
          <div className="flex justify-end">
            <Button variant="text" onPress={onCancel} className="h-auto p-0 text-xs text-(--fg3)">
              取消
            </Button>
          </div>
        }
      />
    </div>
  );
}
