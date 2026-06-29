// apps/web/components/comments/parts/comment-replies.tsx
"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { Button } from "@repo/ui";
import type { CommentReplyResp, CommentReplyPageResp, CommentUserResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { useCommentLike } from "@/hooks/use-comment-like";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import { ThreadReplyItem } from "./thread-comment-item";
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
  onLikeResult?: (replyId: number, isLiked: boolean, likeCount: number) => void;
  currentUserId?: number | null;
  onDeleteReply?: (replyId: number) => Promise<boolean>;
  onEditReply?: (target: ReplyEditTarget) => void;
  linkProfile?: boolean;
}

const ReplyItem = memo(function ReplyItem({
  reply,
  commentId,
  targetType,
  onReply,
  onLikeResult,
  currentUserId,
  onDeleteReply,
  onEditReply,
  linkProfile = false,
}: ReplyItemProps) {
  const { userId } = useSession();
  const openLoginModal = useLoginModal((s) => s.open);
  const { toggleReplyLike } = useCommentLike(targetType);
  const isOwnReply = currentUserId != null && currentUserId === reply.from_user_id;

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

  const handleReply = useCallback(() => {
    const fromName = reply.from_user?.nickname ?? reply.from_user?.username ?? "匿名";
    onReply?.({ commentId, parentReplyId: reply.id, toUsername: fromName });
  }, [onReply, commentId, reply.id, reply.from_user]);

  const handleDelete = useCallback(() => {
    return onDeleteReply?.(reply.id) ?? false;
  }, [onDeleteReply, reply.id]);

  const handleEdit = useCallback(() => {
    if (!isOwnReply || !onEditReply) return;
    // 编辑时优先使用 pending_content，让作者编辑待审版本而非公开旧版本
    const pendingContent =
      reply.moderation?.pending_content?.trim() && reply.moderation!.pending_content!.length > 0
        ? reply.moderation!.pending_content!
        : reply.content;
    onEditReply({
      type: "reply",
      id: reply.id,
      commentId,
      parentReplyId: reply.parent_reply_id,
      initialContent: pendingContent,
      pendingReview: Boolean(reply.moderation?.has_pending_revision),
    });
  }, [isOwnReply, onEditReply, reply, commentId]);

  return (
    <ThreadReplyItem
      user={reply.from_user}
      createdAt={reply.created_at}
      content={reply.content}
      mentionUser={reply.to_user}
      likeCount={reply.like_count}
      isLiked={reply.is_liked}
      onLike={() => void handleLike()}
      onReply={onReply ? handleReply : undefined}
      onDelete={isOwnReply && onDeleteReply ? handleDelete : undefined}
      onEdit={isOwnReply && onEditReply ? handleEdit : undefined}
      deleteLabel="删除回复"
      deleteConfirmMessage="确定删除这条回复吗？"
      linkProfile={linkProfile}
      moderation={reply.moderation}
    />
  );
});

export interface CommentRepliesProps {
  commentId: number;
  targetType: TargetType;
  replyCount: number;
  pendingReply?: CommentReplyResp | null;
  /** 编辑成功后由父组件传入的最新回复，触发一次按 ID 原位替换；传入同一引用只替换一次。 */
  editedReply?: CommentReplyResp | null;
  onReply: (target: ReplyTarget) => void;
  currentUserId?: number | null;
  onDeleteReply?: (replyId: number) => Promise<boolean>;
  onReplyDeleted?: (replyId: number) => void;
  onEditReply?: (target: ReplyEditTarget) => void;
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
  currentUserId,
  onDeleteReply,
  onReplyDeleted,
  onEditReply,
  onOpenChange,
  linkProfile = true,
}: CommentRepliesProps) {
  const [isOpen, setIsOpen] = useState(false);
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
        if (!append) setIsOpen(true);
      } catch (err) {
        setError(getApiErrorMessage(err, "加载回复失败"));
      } finally {
        setIsLoading(false);
      }
    },
    [targetType, commentId],
  );

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setError(null);
      void fetchReplies(1, false);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, fetchReplies]);

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
      <div className="mb-3">
        <Button
          variant="text"
          onPress={handleToggle}
          isDisabled={isLoading}
          className="flex h-auto min-h-0 items-center gap-1.5 p-0 text-xs leading-none text-(--fg2) transition-colors"
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
            onLikeResult={updateReplyLike}
            currentUserId={currentUserId}
            onDeleteReply={onDeleteReply ? handleDeleteReply : undefined}
            onEditReply={onEditReply}
            linkProfile={linkProfile}
          />
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-3 flex gap-3">
        {hasMore && (
          <Button
            variant="text"
            size="sm"
            isDisabled={isLoading}
            onPress={handleLoadMore}
            className="flex items-center gap-1 text-xs font-semibold text-(--fg2)"
          >
            {isLoading && (
              <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
            )}
            {isLoading ? "加载中" : "查看更多回复"}
          </Button>
        )}
        <Button
          variant="text"
          size="sm"
          onPress={handleToggle}
          className="text-xs font-semibold text-(--fg2)"
        >
          收起回复
        </Button>
      </div>
    </div>
  );
});
