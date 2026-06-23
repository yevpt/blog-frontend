"use client";

import type { NotificationItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { formatDateTime, formatRelativeTime } from "@/lib/format-time";
import {
  getNotificationVisual,
  getNotificationSourceParts,
  getNotificationTitle,
  TONE_CLASS,
} from "./notification-type";

interface NotificationCardProps {
  item: NotificationItemResp;
  selecting: boolean;
  selected: boolean;
  onOpen: (item: NotificationItemResp) => void;
  onRead: (id: number) => void;
  onRemove: (id: number) => void;
  onToggleSelect: (id: number) => void;
}

export default function NotificationCard({
  item,
  selecting,
  selected,
  onOpen,
  onRead,
  onRemove,
  onToggleSelect,
}: NotificationCardProps) {
  const visual = getNotificationVisual(item);
  const tone = TONE_CLASS[visual.tone];
  const unread = !item.is_read;
  const created = item.created_at ? new Date(item.created_at) : null;

  function handleBody() {
    if (selecting) onToggleSelect(item.id);
    else onOpen(item);
  }

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-xl border px-3.5 py-3 transition-colors",
        unread ? "border-border bg-muted dark:bg-muted/70" : "border-border/60 bg-card",
      )}
    >
      <div className="relative shrink-0">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            unread ? tone.iconWrap.unread : tone.iconWrap.read,
          )}
        >
          <SvgIcon name={visual.icon} size={18} />
        </span>
        <div
          className={cn(
            "absolute -bottom-1.5 left-1/2 flex -translate-x-1/2 items-center justify-center transition-opacity",
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

      <button type="button" onClick={handleBody} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          {unread && (
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary" aria-hidden />
          )}
          <span
            className={cn(
              "truncate text-sm font-medium",
              unread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {getNotificationTitle(item)}
          </span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", tone.pill)}>
            {visual.label}
          </span>
        </span>
        {item.content_excerpt && (
          <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-muted-foreground">
            「{item.content_excerpt}」
          </span>
        )}
        {created &&
          (() => {
            const parts = getNotificationSourceParts(item);
            return (
              <span
                className="mt-1 flex items-center text-xs text-muted-foreground/80 min-w-0 gap-1"
                title={formatDateTime(created)}
              >
                <span className="shrink-0">{formatRelativeTime(created)}</span>
                {parts && (
                  <>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0">{parts.prefix}</span>
                    {parts.title && (
                      <span className="flex min-w-0 items-center text-foreground/80 hover:text-foreground hover:underline transition-colors">
                        <span className="shrink-0">《</span>
                        <span className="truncate">{parts.title}</span>
                        <span className="shrink-0">》</span>
                      </span>
                    )}
                  </>
                )}
              </span>
            );
          })()}
      </button>

      {!selecting && (
        <span className="flex flex-col gap-1.5 self-center">
          {unread && (
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
          )}
          <Button
            type="button"
            variant={null}
            size={null}
            aria-label="删除"
            onPress={() => onRemove(item.id)}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border bg-card text-destructive/80 hover:bg-destructive/[0.04]"
          >
            <SvgIcon name="trash" size={14} />
          </Button>
        </span>
      )}
    </div>
  );
}
