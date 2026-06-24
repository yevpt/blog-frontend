"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, Popover, PopoverDialog, PopoverTrigger, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { markdownToHtmlSync } from "@repo/markdown";
import { UserAvatar } from "@/components/common/user-avatar";
import { isVipUser } from "@/lib/user-roles";
import { PreviewableMarkdown } from "@/components/common/previewable-markdown";
import { formatDateTime } from "@/lib/format-time";

export interface ThreadUserInfo {
  id?: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  roles?: string[];
}

export function getThreadDisplayName(
  user: { username: string; nickname?: string } | undefined | null,
): string {
  if (!user) return "匿名";
  return user.nickname ?? user.username;
}

function ThreadMarkdownBody({ content }: { content: string }) {
  const html = useMemo(() => markdownToHtmlSync(content), [content]);
  return <PreviewableMarkdown html={html} variant="comment" />;
}

interface ThreadUserNameProps {
  name: string;
  userId?: number;
  linkProfile?: boolean;
}

function ThreadUserName({ name, userId, linkProfile }: ThreadUserNameProps) {
  if (linkProfile && userId) {
    return (
      <Link
        href={`/users/${userId}`}
        className="text-[14px] leading-none font-bold text-foreground"
      >
        {name}
      </Link>
    );
  }
  return <span className="text-[14px] leading-none font-bold text-foreground">{name}</span>;
}

interface ThreadMentionProps {
  name: string;
  userId?: number;
  linkProfile?: boolean;
}

function ThreadMention({ name, userId, linkProfile }: ThreadMentionProps) {
  if (linkProfile && userId) {
    return (
      <Link href={`/users/${userId}`} className="mr-1 text-[11px] font-semibold text-primary">
        @{name}
      </Link>
    );
  }
  return <span className="mr-1 text-[11px] font-semibold text-primary">@{name}</span>;
}

export interface ThreadLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onPress: () => void;
}

export const ThreadLikeButton = memo(function ThreadLikeButton({
  isLiked,
  likeCount,
  onPress,
}: ThreadLikeButtonProps) {
  return (
    <Button
      variant="text"
      onPress={onPress}
      aria-label={isLiked ? "取消点赞" : "点赞"}
      className={cn(
        "flex shrink-0 flex-col items-center gap-0.5",
        isLiked ? "text-red-500 hover:text-red-500 active:text-red-500" : "text-foreground/40",
      )}
    >
      <span className="inline-flex transform-gpu animate-[heartbeat_3s_ease-in-out_infinite] will-change-transform">
        <SvgIcon name="heart-fill" size={24} />
      </span>
      <span
        data-testid="like-count"
        className="block h-3.5 min-w-[1ch] text-center text-[10px] leading-3.5 font-medium tabular-nums"
      >
        {likeCount}
      </span>
    </Button>
  );
});

type DeleteResult = void | boolean | Promise<void | boolean>;

interface ThreadDeleteButtonProps {
  ariaLabel: string;
  confirmMessage: string;
  onConfirm: () => DeleteResult;
}

function ThreadDeleteButton({ ariaLabel, confirmMessage, onConfirm }: ThreadDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="text"
        aria-label={ariaLabel}
        onPress={() => setIsOpen(true)}
        className="h-auto min-h-0 shrink-0 p-0 text-xs leading-none font-medium text-destructive transition-colors hover:text-destructive"
      >
        删除
      </Button>
      <Popover placement="bottom start" offset={6} className="w-56">
        <PopoverDialog aria-label={ariaLabel} className="p-3 outline-none">
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-foreground">{confirmMessage}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" slot="close" isDisabled={isDeleting}>
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                isDisabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onPress={() => {
                  setIsDeleting(true);
                  void Promise.resolve(onConfirm())
                    .then((ok) => {
                      if (ok !== false) setIsOpen(false);
                    })
                    .catch(() => undefined)
                    .finally(() => setIsDeleting(false));
                }}
              >
                {isDeleting ? "删除中..." : "删除"}
              </Button>
            </div>
          </div>
        </PopoverDialog>
      </Popover>
    </PopoverTrigger>
  );
}

export interface ThreadCommentHeaderProps {
  user?: ThreadUserInfo | null;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  onLike: () => void;
  onReply?: () => void;
  onDelete?: () => DeleteResult;
  deleteLabel?: string;
  deleteConfirmMessage?: string;
  linkProfile?: boolean;
}

/** 留言板风格头部：头像 + 用户名/回复/时间 + 右侧点赞 */
export const ThreadCommentHeader = memo(function ThreadCommentHeader({
  user,
  createdAt,
  likeCount,
  isLiked,
  onLike,
  onReply,
  onDelete,
  deleteLabel = "删除评论",
  deleteConfirmMessage = "确定删除这条评论吗？",
  linkProfile = false,
}: ThreadCommentHeaderProps) {
  const displayName = getThreadDisplayName(user);
  const time = formatDateTime(createdAt);

  const avatar = (
    <UserAvatar
      src={user?.avatar_url}
      name={displayName}
      size="ml"
      isVip={isVipUser(user?.roles)}
    />
  );

  return (
    <div className="mb-2 flex gap-2.5">
      {linkProfile && user?.id ? (
        <Link href={`/users/${user.id}`} className="shrink-0">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ThreadUserName name={displayName} userId={user?.id} linkProfile={linkProfile} />
              {onReply && (
                <Button
                  variant="text"
                  onPress={onReply}
                  className="h-auto min-h-0 shrink-0 p-0 text-xs leading-none font-medium text-(--fg3) transition-colors hover:text-foreground"
                >
                  回复
                </Button>
              )}
              {onDelete && (
                <ThreadDeleteButton
                  ariaLabel={deleteLabel}
                  confirmMessage={deleteConfirmMessage}
                  onConfirm={onDelete}
                />
              )}
            </div>
            <span className="mt-1.5 block text-[12px] text-(--fg1)">{time}</span>
          </div>
          <ThreadLikeButton isLiked={isLiked} likeCount={likeCount} onPress={onLike} />
        </div>
      </div>
    </div>
  );
});

export interface ThreadCommentContentProps {
  content: string;
  className?: string;
}

/** 主评论正文，占满卡片宽度 */
export function ThreadCommentContent({ content, className }: ThreadCommentContentProps) {
  return (
    <div className={cn("text-[12px] leading-relaxed text-(--fg1)", className)}>
      <ThreadMarkdownBody content={content} />
    </div>
  );
}

export interface ThreadReplyItemProps {
  user?: ThreadUserInfo | null;
  createdAt: string;
  content: string;
  mentionUser?: ThreadUserInfo | null;
  likeCount: number;
  isLiked: boolean;
  onLike: () => void;
  onReply?: () => void;
  onDelete?: () => DeleteResult;
  deleteLabel?: string;
  deleteConfirmMessage?: string;
  linkProfile?: boolean;
}

/** 留言板风格回复项：头像列 + 头部 + @提及 + 正文 */
export const ThreadReplyItem = memo(function ThreadReplyItem({
  user,
  createdAt,
  content,
  mentionUser,
  likeCount,
  isLiked,
  onLike,
  onReply,
  onDelete,
  deleteLabel = "删除回复",
  deleteConfirmMessage = "确定删除这条回复吗？",
  linkProfile = false,
}: ThreadReplyItemProps) {
  const displayName = getThreadDisplayName(user);
  const mentionName = mentionUser ? getThreadDisplayName(mentionUser) : null;
  const time = formatDateTime(createdAt);

  const avatar = (
    <UserAvatar
      src={user?.avatar_url}
      name={displayName}
      size="ml"
      isVip={isVipUser(user?.roles)}
    />
  );

  return (
    <div className="flex gap-2.5 [animation:replyFadeIn_0.2s_ease-out_both]">
      {linkProfile && user?.id ? (
        <Link href={`/users/${user.id}`} className="shrink-0">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ThreadUserName name={displayName} userId={user?.id} linkProfile={linkProfile} />
              {onReply && (
                <Button
                  variant="text"
                  onPress={onReply}
                  className="h-auto min-h-0 shrink-0 p-0 text-xs leading-none font-medium text-(--fg3) transition-colors hover:text-foreground"
                >
                  回复
                </Button>
              )}
              {onDelete && (
                <ThreadDeleteButton
                  ariaLabel={deleteLabel}
                  confirmMessage={deleteConfirmMessage}
                  onConfirm={onDelete}
                />
              )}
            </div>
            <span className="mt-1.5 block text-[12px] text-(--fg1)">{time}</span>
          </div>
          <ThreadLikeButton isLiked={isLiked} likeCount={likeCount} onPress={onLike} />
        </div>
        <div className="text-[12px] leading-relaxed text-(--fg1)">
          {mentionName && (
            <ThreadMention name={mentionName} userId={mentionUser?.id} linkProfile={linkProfile} />
          )}
          <ThreadMarkdownBody content={content} />
        </div>
      </div>
    </div>
  );
});

/** 回复列表左侧缩进占位，与头像列对齐（仅宽度占位，不设高度，避免撑高展开按钮行） */
export function ThreadReplyIndent({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-[30px] shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
