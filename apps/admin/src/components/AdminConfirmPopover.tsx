import { useState, type ReactNode } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, Popover, PopoverDialog, PopoverTrigger, type PopoverProps } from "@repo/ui";

export interface AdminConfirmPopoverProps {
  ariaLabel: string;
  message: ReactNode;
  confirmLabel: string;
  confirmLoadingLabel?: string;
  isConfirming?: boolean;
  destructive?: boolean;
  placement?: PopoverProps["placement"];
  popoverClassName?: string;
  children: ReactNode;
  onConfirm: () => Promise<void>;
}

/** 管理后台统一的 Popover 二次确认，与文章删除交互一致。 */
export function AdminConfirmPopover({
  ariaLabel,
  message,
  confirmLabel,
  confirmLoadingLabel,
  isConfirming = false,
  destructive = false,
  placement = "bottom end",
  popoverClassName = "w-72 max-w-[calc(100vw-1.5rem)]",
  children,
  onConfirm,
}: AdminConfirmPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      {children}
      <Popover placement={placement} offset={6} className={popoverClassName}>
        <PopoverDialog aria-label={ariaLabel} className="overflow-hidden p-0 outline-none">
          <div className="flex items-start gap-3 p-4">
            <span
              className={
                destructive
                  ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                  : "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              }
              aria-hidden="true"
            >
              <SvgIcon name={destructive ? "alert-circle" : "help-circle"} size={16} />
            </span>
            <p className="min-w-0 pt-0.5 text-sm leading-6 text-foreground">{message}</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 bg-muted/20 px-3 py-2.5">
            <Button variant="outline" size="sm" slot="close" isDisabled={isConfirming}>
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              isDisabled={isConfirming}
              className={
                destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onPress={() => {
                void onConfirm()
                  .then(() => {
                    setIsOpen(false);
                  })
                  .catch(() => undefined);
              }}
            >
              {isConfirming ? (confirmLoadingLabel ?? `${confirmLabel}中…`) : confirmLabel}
            </Button>
          </div>
        </PopoverDialog>
      </Popover>
    </PopoverTrigger>
  );
}
