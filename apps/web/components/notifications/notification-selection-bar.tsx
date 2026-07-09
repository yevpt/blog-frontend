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

/** 全选三态 checkbox：indeterminate 是 DOM 属性，需要 ref 手动同步；视觉上换成圆角自绘样式，与站内其它勾选态统一 */
function SelectAllCheckbox({ checked, indeterminate, onChange }: SelectAllCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label="全选"
        className={cn(
          "h-4 w-4 cursor-pointer appearance-none rounded-[5px] border transition-colors",
          checked || indeterminate ? "border-primary bg-primary" : "border-border",
        )}
      />
      {checked && (
        <SvgIcon
          name="check"
          size={11}
          className="pointer-events-none absolute text-primary-foreground"
        />
      )}
      {!checked && indeterminate && (
        <span className="pointer-events-none absolute h-[2px] w-2 rounded-full bg-primary-foreground" />
      )}
    </span>
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
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)] md:bottom-6">
      <div
        className={cn(
          "flex flex-col gap-2.5 rounded-2xl px-4 py-3",
          "ring-1 backdrop-blur-xl",
          "ring-border bg-background/95 text-foreground shadow-[0_12px_32px_rgba(0,0,0,0.16)]",
          "dark:ring-[color:var(--glass-bdr)] dark:bg-card/95",
          "dark:shadow-[0_0_0_1px_var(--glass-ring),0_12px_36px_rgba(0,0,0,0.55)]",
          "sm:flex-row sm:items-center sm:gap-4",
        )}
      >
        <label className="flex items-center gap-2 text-sm">
          <SelectAllCheckbox
            checked={allSelected}
            indeterminate={count > 0 && !allSelected}
            onChange={onToggleSelectAll}
          />
          <span className="whitespace-nowrap text-muted-foreground">已选 {count} 条</span>
        </label>
        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
        <span className="flex items-center justify-end gap-2 sm:justify-start">
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
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
  );
}
