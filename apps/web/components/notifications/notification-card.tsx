"use client";

import { useCallback, useState } from "react";
import type { MouseEvent, KeyboardEvent } from "react";
import Link from "next/link";
import type { NotificationItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import { RelativeTime } from "@/components/common/relative-time";
import { NotificationExcerptContent } from "./notification-excerpt-content";
import {
  getNotificationActionText,
  getNotificationActorName,
  getNotificationActorProfileHref,
  getNotificationBodyText,
  getModerationNotificationReasonText,
  getNotificationInlineActions,
  getNotificationQuote,
} from "./notification-type";
import { NotificationInlineReplyInput } from "./notification-inline-reply-input";
import { useNotificationCardLongPress } from "./use-notification-card-long-press";
import { formatDateTime } from "@/lib/format-time";

interface NotificationCardProps {
  item: NotificationItemResp;
  selecting: boolean;
  selected: boolean;
  onOpen: (item: NotificationItemResp) => void;
  onRead: (id: number) => void;
  onToggleSelect: (id: number) => void;
  onInlineLike?: (item: NotificationItemResp) => void | Promise<void>;
  onInlineReplySubmit?: (item: NotificationItemResp, content: string) => Promise<boolean>;
  isReplySubmitting?: boolean;
}

/** 正文含 Markdown 链接/图片时，避免误触整卡跳转。 */
function shouldIgnoreCardOpenClick(target: HTMLElement): boolean {
  return Boolean(
    target.closest("a, button, input, textarea, img, .md-copy-btn, [contenteditable='true']"),
  );
}

export default function NotificationCard({
  item,
  selecting,
  selected,
  onOpen,
  onRead,
  onToggleSelect,
  onInlineLike,
  onInlineReplySubmit,
  isReplySubmitting = false,
}: NotificationCardProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const unread = !item.is_read;
  const created = item.created_at ? new Date(item.created_at) : null;
  const actorName = getNotificationActorName(item);
  const actorProfileHref = getNotificationActorProfileHref(item);
  const actionText = getNotificationActionText(item);
  const bodyText = getNotificationBodyText(item);
  const moderationReason = getModerationNotificationReasonText(item);
  const displayBodyText = moderationReason ?? bodyText;
  const quote = getNotificationQuote(item);
  const inlineActions = getNotificationInlineActions(item);

  const handleLongPressSelect = useCallback(() => {
    if (!selecting) onToggleSelect(item.id);
  }, [item.id, onToggleSelect, selecting]);

  const { longPressProps, consumeLongPressClick, isTouchPressing } = useNotificationCardLongPress({
    disabled: selecting,
    onLongPress: handleLongPressSelect,
  });

  function handleBody() {
    if (selecting) onToggleSelect(item.id);
    else onOpen(item);
  }

  function handleContentClick(event: MouseEvent<HTMLElement>) {
    if (consumeLongPressClick()) return;
    if (shouldIgnoreCardOpenClick(event.target as HTMLElement)) return;
    handleBody();
  }

  function handleContentKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleBody();
  }

  function openReply() {
    setReplyOpen(true);
  }

  function closeReply() {
    setReplyOpen(false);
    setReplyContent("");
  }

  async function handleReplySubmit() {
    if (!onInlineReplySubmit || !replyContent.trim()) return;
    const ok = await onInlineReplySubmit(item, replyContent);
    if (ok) closeReply();
  }

  const showMarkRead = !selecting && unread;

  return (
    <div
      data-testid="notification-card"
      {...longPressProps}
      className={cn(
        "group grid gap-3 rounded-xl border px-3.5 py-3 transition-colors",
        isTouchPressing && "select-none",
        showMarkRead
          ? "grid-cols-[2.625rem_minmax(0,1fr)_2rem]"
          : "grid-cols-[2.625rem_minmax(0,1fr)]",
        unread ? "border-border bg-muted/55 dark:bg-muted/60" : "border-border/60 bg-card",
      )}
    >
      <div className="flex flex-col items-center gap-3">
        {actorProfileHref ? (
          <Link href={actorProfileHref} className="shrink-0" aria-label={`查看${actorName}的主页`}>
            <UserAvatar
              src={item.actor_user?.avatar_url}
              userId={item.actor_user?.id}
              name={actorName}
              size="lg"
            />
          </Link>
        ) : (
          <UserAvatar
            src={item.actor_user?.avatar_url}
            userId={item.actor_user?.id}
            name={actorName}
            size="lg"
          />
        )}
        <div
          className={cn(
            "flex items-center justify-center transition-opacity",
            selecting || selected
              ? "opacity-100"
              : "opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100",
          )}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            aria-label="选择该通知"
            className="h-4 w-4 cursor-pointer accent-primary"
          />
        </div>
      </div>

      <div className="min-w-0">
        <div
          className="w-full cursor-pointer text-left"
          onClick={handleContentClick}
          onKeyDown={handleContentKeyDown}
          role={selecting ? undefined : "button"}
          tabIndex={selecting ? undefined : 0}
        >
          <span className="flex min-w-0 items-center gap-2">
            {unread && (
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary" aria-hidden />
            )}
            {actorProfileHref ? (
              <Link
                href={actorProfileHref}
                className="truncate text-sm font-medium text-foreground"
              >
                {actorName}
              </Link>
            ) : (
              <span className="truncate text-sm font-medium text-foreground">{actorName}</span>
            )}
          </span>
          <span
            className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
            title={created ? formatDateTime(created) : undefined}
          >
            <span className="font-medium text-foreground/75">{actionText}</span>
            {created && <RelativeTime dateTime={created} />}
          </span>
          {displayBodyText && (
            <NotificationExcerptContent
              content={displayBodyText}
              className={cn("mt-2", !moderationReason && "line-clamp-2")}
            />
          )}
          {quote && (
            <span className="mt-2 grid grid-cols-[0.875rem_minmax(0,1fr)] gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
              <span
                className="my-0.5 w-0.5 rounded-full bg-border justify-self-center"
                aria-hidden
              />
              <span className="min-w-0">
                {quote.title && (
                  <span className="mb-0.5 block truncate font-medium text-foreground/60">
                    {quote.title}
                  </span>
                )}
                {quote.text && <span className="line-clamp-2">{quote.text}</span>}
              </span>
            </span>
          )}
        </div>
        {(inlineActions.canLike || inlineActions.canReply) && (
          <span className="mt-2 flex items-center gap-1.5">
            {inlineActions.canLike && (
              <Button
                type="button"
                variant={null}
                size={null}
                onPress={() => void onInlineLike?.(item)}
                aria-label={item.is_liked ? "取消点赞" : "点赞"}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs hover:bg-foreground/[0.04]",
                  item.is_liked ? "text-red-500" : "text-muted-foreground",
                )}
              >
                <SvgIcon name="heart-fill" size={13} />
                <span className="tabular-nums">{item.like_count ?? 0}</span>
                点赞
              </Button>
            )}
            {inlineActions.canReply && (
              <Button
                type="button"
                variant={null}
                size={null}
                onPress={openReply}
                aria-pressed={replyOpen}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs hover:bg-foreground/[0.04]",
                  replyOpen ? "text-primary" : "text-muted-foreground",
                )}
              >
                <SvgIcon name="message-circle" size={13} />
                <span className="tabular-nums">{item.reply_count ?? 0}</span>
                回复
              </Button>
            )}
          </span>
        )}
        {replyOpen && (
          <NotificationInlineReplyInput
            actorName={actorName}
            value={replyContent}
            onChange={setReplyContent}
            onSubmit={() => void handleReplySubmit()}
            onCancel={closeReply}
            isSubmitting={isReplySubmitting}
          />
        )}
      </div>

      {showMarkRead && (
        <span className="flex flex-col gap-1.5 self-start">
          <Button
            type="button"
            variant={null}
            size={null}
            aria-label="标记已读"
            onPress={() => onRead(item.id)}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border bg-card text-foreground/70 hover:bg-foreground/[0.04]"
          >
            <SvgIcon name="check" size={14} />
          </Button>
        </span>
      )}
    </div>
  );
}
