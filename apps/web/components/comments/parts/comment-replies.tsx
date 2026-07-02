// apps/web/components/comments/parts/comment-replies.tsx
"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@repo/ui";
import type { CommentReplyResp, CommentReplyPageResp, CommentUserResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentRepliesStore } from "@/store/use-comment-replies-store";
import { useCommentLike } from "@/hooks/use-comment-like";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import { ThreadReplyItem } from "./thread-comment-item";
import { InlineReplyEditor } from "../inputs/inline-reply-editor";
import { ReplyBanner } from "../inputs/reply-banner";

import type { ReplyEditTarget, ReplyTarget } from "./comment-item";

export type { ReplyTarget };

const PAGE_SIZE = 5;

export type TargetType = "article" | "moment" | "guestbook";

// 后端分页偶尔漏掉 avatar_url，同一会话内按用户复用已知头像。
const replyAvatarByUser = new Map<string, string>();

function commentUserKey(user: CommentUserResp | undefined): string | null {
  if (!user) return null;
  if (typeof user.id === "number") return `id:${user.id}`;
  return user.username ? `username:${user.username}` : null;
}

function hydrateUserAvatar(
  user: CommentUserResp | undefined,
  avatarByUser: Map<string, string>,
): CommentUserResp | undefined {
  const key = commentUserKey(user);
  if (!user || !key) return user;

  const cachedAvatar = avatarByUser.get(key) ?? replyAvatarByUser.get(key);
  if (user.avatar_url) return user;
  return cachedAvatar ? { ...user, avatar_url: cachedAvatar } : user;
}

function rememberUserAvatar(user: CommentUserResp | undefined, avatarByUser: Map<string, string>) {
  const key = commentUserKey(user);
  if (key && user?.avatar_url) {
    avatarByUser.set(key, user.avatar_url);
    replyAvatarByUser.set(key, user.avatar_url);
  }
}

function hydrateReplyAvatars(replies: CommentReplyResp[]): CommentReplyResp[] {
  const avatarByUser = new Map(replyAvatarByUser);

  for (const reply of replies) {
    rememberUserAvatar(reply.from_user, avatarByUser);
    rememberUserAvatar(reply.to_user, avatarByUser);
  }

  return replies.map((reply) => ({
    ...reply,
    from_user: hydrateUserAvatar(reply.from_user, avatarByUser),
    to_user: hydrateUserAvatar(reply.to_user, avatarByUser),
  }));
}

function replyUrl(targetType: TargetType, commentId: number, page: number): string {
  const base =
    targetType === "article"
      ? `/api/articles/comments/${commentId}/replies`
      : targetType === "moment"
        ? `/api/moments/comments/${commentId}/replies`
        : `/api/guestbook/comments/${commentId}/replies`;
  const qs = buildQuery({ page, page_size: PAGE_SIZE });
  return `${base}?${qs}`;
}

interface ReplyItemProps {
  reply: CommentReplyResp;
  commentId: number;
  targetType: TargetType;
  onReply?: (target: ReplyTarget) => void;
  onSubmitReply?: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  onLikeResult?: (replyId: number, isLiked: boolean, likeCount: number) => void;
  currentUserId?: number | null;
  onDeleteReply?: (replyId: number) => Promise<boolean>;
  onEditReply?: (target: ReplyEditTarget) => void;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  linkProfile?: boolean;
}

const ReplyItem = memo(function ReplyItem({
  reply,
  commentId,
  targetType,
  onReply,
  onSubmitReply,
  onLikeResult,
  currentUserId,
  onDeleteReply,
  onEditReply,
  onSubmitEditReply,
  linkProfile = false,
}: ReplyItemProps) {
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const { toggleReplyLike } = useCommentLike(targetType);
  const isOwnReply = currentUserId != null && currentUserId === reply.from_user_id;
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleLike = useCallback(async () => {
    if (!userId) {
      openLoginModal();
      return;
    }
    const result = await toggleReplyLike(commentId, reply.id);
    if (result) {
      onLikeResult?.(reply.id, result.is_liked, result.like_count);
    }
  }, [userId, openLoginModal, toggleReplyLike, commentId, reply.id, onLikeResult]);

  const canReply = Boolean(onSubmitReply || onReply);
  const canEdit = Boolean(onSubmitEditReply || onEditReply);

  const fromName = reply.from_user?.nickname ?? reply.from_user?.username ?? "匿名";

  const handleReply = useCallback(() => {
    if (onSubmitReply) {
      if (isReplying) {
        setIsReplying(false);
        return;
      }
      if (!userId) {
        openLoginModal();
        return;
      }
      setIsEditing(false);
      setIsReplying(true);
      return;
    }
    if (!userId) {
      openLoginModal();
      return;
    }
    onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName });
  }, [isReplying, userId, openLoginModal, onSubmitReply, onReply, commentId, reply.id, fromName]);

  const handleDelete = useCallback(() => {
    return onDeleteReply?.(reply.id) ?? false;
  }, [onDeleteReply, reply.id]);

  // 编辑时优先使用 pending_content，让作者编辑待审版本而非公开旧版本
  const pendingContent =
    reply.moderation?.pending_content?.trim() && reply.moderation!.pending_content!.length > 0
      ? reply.moderation!.pending_content!
      : reply.content;

  const handleEdit = useCallback(() => {
    if (!isOwnReply || !canEdit) return;
    if (onSubmitEditReply) {
      if (isEditing) {
        setIsEditing(false);
        return;
      }
      setIsReplying(false);
      setIsEditing(true);
      return;
    }
    onEditReply?.({
      type: "reply",
      id: reply.id,
      commentId,
      parentReplyId: reply.parent_reply_id,
      initialContent: pendingContent,
      pendingReview: Boolean(reply.moderation?.has_pending_revision),
    });
  }, [
    isOwnReply,
    canEdit,
    isEditing,
    onSubmitEditReply,
    onEditReply,
    reply,
    commentId,
    pendingContent,
  ]);

  const handleReplySubmit = useCallback(
    async (content: string) => {
      const ok = (await onSubmitReply?.(commentId, reply.id, content)) ?? false;
      if (ok) setIsReplying(false);
      return ok;
    },
    [onSubmitReply, commentId, reply.id],
  );

  const handleEditSubmit = useCallback(
    async (content: string) => {
      const ok =
        (await onSubmitEditReply?.(reply.id, reply.parent_reply_id, commentId, content)) ?? false;
      if (ok) setIsEditing(false);
      return ok;
    },
    [onSubmitEditReply, reply.id, reply.parent_reply_id, commentId],
  );

  return (
    <div className="flex flex-col gap-3">
      <ThreadReplyItem
        user={reply.from_user}
        createdAt={reply.created_at}
        content={reply.content}
        mentionUser={reply.to_user}
        likeCount={reply.like_count}
        isLiked={reply.is_liked}
        onLike={() => void handleLike()}
        onReply={canReply ? handleReply : undefined}
        isReplying={isReplying}
        onDelete={isOwnReply && onDeleteReply ? handleDelete : undefined}
        onEdit={isOwnReply && canEdit ? handleEdit : undefined}
        isEditing={isEditing}
        deleteLabel="删除回复"
        deleteConfirmMessage="确定删除这条回复吗？"
        linkProfile={linkProfile}
        moderation={reply.moderation}
        isOwner={isOwnReply}
      />
      {isReplying && (
        <InlineReplyEditor
          placeholder="请输入你的回复内容"
          header={<ReplyBanner toUsername={fromName} onCancel={() => setIsReplying(false)} />}
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleReplySubmit}
        />
      )}
      {isEditing && (
        <InlineReplyEditor
          initialValue={pendingContent}
          placeholder="编辑内容..."
          header={
            <ReplyBanner
              toUsername="编辑中"
              onCancel={() => setIsEditing(false)}
              editing
              pendingReview={Boolean(reply.moderation?.has_pending_revision)}
            />
          }
          isLoggedIn={!!userId}
          onLoginRequired={openLoginModal}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
});

export interface CommentRepliesProps {
  commentId: number;
  targetType: TargetType;
  replyCount: number;
  pendingReply?: CommentReplyResp | null;
  /** 编辑成功后由父组件传入的最新回复，触发一次按 ID 原位替换；传入同一引用只替换一次。 */
  editedReply?: CommentReplyResp | null;
  onReply?: (target: ReplyTarget) => void;
  onSubmitReply?: (
    commentId: number,
    parentReplyId: number | undefined,
    content: string,
  ) => Promise<boolean>;
  currentUserId?: number | null;
  onDeleteReply?: (replyId: number) => Promise<boolean>;
  onReplyDeleted?: (replyId: number) => void;
  onEditReply?: (target: ReplyEditTarget) => void;
  onSubmitEditReply?: (
    replyId: number,
    parentReplyId: number,
    commentId: number,
    content: string,
  ) => Promise<boolean>;
  onOpenChange?: (open: boolean) => void;
  linkProfile?: boolean;
}

export const CommentReplies = memo(function CommentReplies({
  commentId,
  targetType,
  replyCount,
  pendingReply,
  editedReply,
  onReply,
  onSubmitReply,
  currentUserId,
  onDeleteReply,
  onReplyDeleted,
  onEditReply,
  onSubmitEditReply,
  onOpenChange,
  linkProfile = true,
}: CommentRepliesProps) {
  const isOpen = useCommentRepliesStore((s) => s.openKeys.has(`${targetType}:${commentId}`));
  const setStoreOpen = useCommentRepliesStore((s) => s.setOpen);
  const [replies, setReplies] = useState<CommentReplyResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedReplyIds, setDeletedReplyIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const fetchReplies = useCallback(
    async (pageNum: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiJson<CommentReplyPageResp>(replyUrl(targetType, commentId, pageNum));
        setReplies((prev) => hydrateReplyAvatars(append ? [...prev, ...data.list] : data.list));
        setPage(pageNum);
        setHasMore(pageNum < data.pages);
        if (!append) setStoreOpen(targetType, commentId, true);
      } catch (err) {
        setError(getApiErrorMessage(err, "加载回复失败"));
      } finally {
        setIsLoading(false);
      }
    },
    [targetType, commentId, setStoreOpen],
  );

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setError(null);
      void fetchReplies(1, false);
    } else {
      setStoreOpen(targetType, commentId, false);
    }
  }, [isOpen, fetchReplies, setStoreOpen, targetType, commentId]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) void fetchReplies(page + 1, true);
  }, [isLoading, hasMore, page, fetchReplies]);

  const updateReplyLike = useCallback((replyId: number, isLiked: boolean, likeCount: number) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === replyId ? { ...r, is_liked: isLiked, like_count: likeCount } : r)),
    );
  }, []);

  /** 编辑成功后按 ID 原位替换回复项，不改变回复计数。 */
  const updateReply = useCallback((updated: CommentReplyResp) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === updated.id ? hydrateReplyAvatars([updated])[0] : r)),
    );
  }, []);

  // 展开态从 store 恢复（如路由返回导航后重新挂载）但本地回复数据已清空时，
  // 自动重新拉取一次，避免停留在「已展开但空列表」的状态
  const didAutoRestoreRef = useRef(false);
  useEffect(() => {
    if (didAutoRestoreRef.current) return;
    didAutoRestoreRef.current = true;
    if (isOpen && replies.length === 0) {
      void fetchReplies(1, false);
    }
  }, [isOpen, replies.length, fetchReplies]);

  const handleDeleteReply = useCallback(
    async (replyId: number) => {
      if (!onDeleteReply) return false;
      const ok = await onDeleteReply(replyId);
      if (!ok) return false;
      setReplies((prev) => prev.filter((reply) => reply.id !== replyId));
      setDeletedReplyIds((prev) => {
        const next = new Set(prev);
        next.add(replyId);
        return next;
      });
      onReplyDeleted?.(replyId);
      return true;
    },
    [onDeleteReply, onReplyDeleted],
  );

  // 编辑成功后由父组件通过 editedReply prop 触发一次原位替换，避免与新增回复的 pendingReply 通道冲突。
  useEffect(() => {
    if (editedReply) updateReply(editedReply);
  }, [editedReply, updateReply]);

  if (replyCount <= 0) return null;

  // pendingReply 仅在服务端尚未返回该回复时作为占位追加；
  // 一旦 replies 已包含同 id 回复，以服务端数据为准（点赞状态可被 updateReplyLike 正常更新）。
  const displayReplies = hydrateReplyAvatars(
    pendingReply && !replies.some((r) => r.id === pendingReply.id)
      ? [...replies, pendingReply]
      : replies,
  ).filter((reply) => !deletedReplyIds.has(reply.id));

  if (!isOpen) {
    return (
      <div className="mt-1 mb-1">
        <Button
          variant="text"
          onPress={handleToggle}
          isDisabled={isLoading}
          className="-mx-1 -my-3 flex h-auto min-h-0 items-center gap-1.5 px-1 py-3 text-xs leading-none text-(--fg2) transition-colors"
        >
          <div className="h-px w-4 bg-accent-foreground/15" />
          {isLoading ? (
            <>
              <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
              加载中
            </>
          ) : (
            <>展开 {replyCount} 条回复</>
          )}
        </Button>
        {error && !isLoading && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        {displayReplies.map((reply) => (
          <ReplyItem
            key={reply.id}
            reply={reply}
            commentId={commentId}
            targetType={targetType}
            onReply={onReply}
            onSubmitReply={onSubmitReply}
            onLikeResult={updateReplyLike}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onEditReply={onEditReply}
            onSubmitEditReply={onSubmitEditReply}
            linkProfile={linkProfile}
          />
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-3 flex gap-3">
        <Button
          variant="text"
          size="sm"
          onPress={handleToggle}
          className="-mx-1 -my-2.5 h-auto min-h-0 px-1 py-2.5 text-xs font-semibold text-(--fg2)"
        >
          收起回复
        </Button>
        {hasMore && (
          <Button
            variant="text"
            size="sm"
            isDisabled={isLoading}
            onPress={handleLoadMore}
            className="-mx-1 -my-2.5 flex h-auto min-h-0 items-center gap-1 px-1 py-2.5 text-xs font-semibold text-(--fg2)"
          >
            {isLoading && (
              <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
            )}
            {isLoading ? "加载中" : "查看更多回复"}
          </Button>
        )}
      </div>
    </div>
  );
});
