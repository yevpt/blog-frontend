"use client";

import { useEffect, useRef } from "react";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";

interface NotificationSelectionBarProps {
  count: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onInvertSelect: () => void;
  onMarkRead: () => void;
  onCancel: () => void;
}

interface SelectAllCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}

/** 全选三态 checkbox：indeterminate 是 DOM 属性，需要 ref 手动同步 */
function SelectAllCheckbox({ checked, indeterminate, onChange }: SelectAllCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label="全选"
      className="h-4 w-4 cursor-pointer accent-primary"
    />
  );
}

export default function NotificationSelectionBar({
  count,
  allSelected,
  onToggleSelectAll,
  onInvertSelect,
  onMarkRead,
  onCancel,
}: NotificationSelectionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-5 z-40 pb-[env(safe-area-inset-bottom)] md:bottom-6">
      <div className="mx-auto w-full max-w-2xl px-4">
        <div
          className={cn(
            "flex flex-col gap-2 rounded-xl px-4 py-3",
            "ring-1 shadow-sm backdrop-blur-xl",
            "ring-border/50 bg-background/85 text-foreground",
            "dark:ring-[color:var(--glass-bdr)] dark:bg-card/90",
            "dark:shadow-[0_0_0_1px_var(--glass-ring),0_4px_20px_rgba(0,0,0,0.4)]",
            "sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <label className="flex items-center gap-2 text-sm">
            <SelectAllCheckbox
              checked={allSelected}
              indeterminate={count > 0 && !allSelected}
              onChange={onToggleSelectAll}
            />
            <span className="text-muted-foreground">已选 {count} 条</span>
          </label>
          <span className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant={null}
              size={null}
              onPress={onInvertSelect}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
            >
              反选
            </Button>
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
      </div>
    </div>
  );
}
