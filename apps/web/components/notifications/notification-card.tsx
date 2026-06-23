"use client";

import type { NotificationItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { formatDateTime, formatRelativeTime } from "@/lib/format-time";
import { getNotificationVisual, TONE_CLASS } from "./notification-type";

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
        "group flex gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors",
        unread ? "bg-primary/5" : "bg-card opacity-90",
      )}
    >
      {selecting && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          aria-label="选择该通知"
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
        />
      )}
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          tone.iconWrap,
        )}
      >
        <SvgIcon name={visual.icon} size={18} />
      </span>

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
            {item.title || "你有一条新消息"}
          </span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", tone.pill)}>
            {visual.label}
          </span>
        </span>
        {item.content_excerpt && (
          <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-muted-foreground">
            {item.content_excerpt}
          </span>
        )}
        {created && (
          <span
            className="mt-1 block text-xs text-muted-foreground/80"
            title={formatDateTime(created)}
          >
            {formatRelativeTime(created)}
          </span>
        )}
      </button>

      {!selecting && (
        <span className="flex flex-col gap-1.5 self-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          {unread && (
            <Button
              type="button"
              variant={null}
              size={null}
              aria-label="标记已读"
              onPress={() => onRead(item.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06]"
            >
              <SvgIcon name="check" size={16} />
            </Button>
          )}
          <Button
            type="button"
            variant={null}
            size={null}
            aria-label="删除"
            onPress={() => onRemove(item.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-destructive/80 hover:bg-destructive/[0.08]"
          >
            <SvgIcon name="trash" size={16} />
          </Button>
        </span>
      )}
    </div>
  );
}
