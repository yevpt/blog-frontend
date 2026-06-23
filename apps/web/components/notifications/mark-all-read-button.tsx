"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, Popover, PopoverDialog, PopoverTrigger, Tooltip } from "@repo/ui";

const ICON_BTN_CLASS =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:bg-foreground/[0.04] disabled:opacity-50";

interface MarkAllReadButtonProps {
  unreadCount: number;
  onConfirm: () => void | Promise<void>;
}

export function MarkAllReadButton({ unreadCount, onConfirm }: MarkAllReadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDisabled = unreadCount === 0;

  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Tooltip title="全部已读" placement="top" delay={200} isDisabled={isOpen || isDisabled}>
        <Button
          type="button"
          variant={null}
          size={null}
          aria-label="全部已读"
          isDisabled={isDisabled}
          onPress={() => setIsOpen(true)}
          className={ICON_BTN_CLASS}
        >
          <SvgIcon name="checks" size={14} />
        </Button>
      </Tooltip>
      <Popover placement="bottom end" offset={6} className="w-64">
        <PopoverDialog aria-label="确认全部已读" className="p-3 outline-none">
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-foreground">确定将全部未读消息标记为已读吗？</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" slot="close" isDisabled={isSubmitting}>
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                isDisabled={isSubmitting}
                onPress={() => {
                  setIsSubmitting(true);
                  void Promise.resolve(onConfirm())
                    .then(() => setIsOpen(false))
                    .catch(() => undefined)
                    .finally(() => setIsSubmitting(false));
                }}
              >
                {isSubmitting ? "处理中..." : "确认"}
              </Button>
            </div>
          </div>
        </PopoverDialog>
      </Popover>
    </PopoverTrigger>
  );
}
