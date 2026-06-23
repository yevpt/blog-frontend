"use client";

import { cn } from "@repo/ui";

interface NotificationFilterTabsProps {
  unreadOnly: boolean;
  unreadCount: number;
  onChange: (unreadOnly: boolean) => void;
}

export default function NotificationFilterTabs({
  unreadOnly,
  unreadCount,
  onChange,
}: NotificationFilterTabsProps) {
  return (
    <div role="tablist" className="flex gap-1">
      <button
        type="button"
        role="tab"
        aria-selected={!unreadOnly}
        onClick={() => onChange(false)}
        className={cn(
          "px-1 py-2 text-sm",
          !unreadOnly
            ? "border-b-2 border-primary font-medium text-foreground"
            : "text-muted-foreground",
        )}
      >
        全部
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={unreadOnly}
        onClick={() => onChange(true)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-sm",
          unreadOnly
            ? "border-b-2 border-primary font-medium text-foreground"
            : "text-muted-foreground",
        )}
      >
        未读
        {unreadCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
