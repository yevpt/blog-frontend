"use client";

import { Button } from "@repo/ui";
import { SvgIcon } from "@repo/icons";

interface NotificationSelectionBarProps {
  count: number;
  onMarkRead: () => void;
  onCancel: () => void;
}

export default function NotificationSelectionBar({
  count,
  onMarkRead,
  onCancel,
}: NotificationSelectionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 mt-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 backdrop-blur">
      <span className="text-sm text-muted-foreground">已选 {count} 条</span>
      <span className="flex gap-2">
        <Button
          type="button"
          variant={null}
          size={null}
          isDisabled={count === 0}
          onPress={onMarkRead}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <SvgIcon name="check" size={15} />
          标记已读
        </Button>
        <Button
          type="button"
          variant={null}
          size={null}
          onPress={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
        >
          取消
        </Button>
      </span>
    </div>
  );
}
