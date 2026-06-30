import { useState, type ReactNode } from "react";
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
  popoverClassName = "w-64",
  children,
  onConfirm,
}: AdminConfirmPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      {children}
      <Popover placement={placement} offset={6} className={popoverClassName}>
        <PopoverDialog aria-label={ariaLabel} className="p-3 outline-none">
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-foreground">{message}</p>
            <div className="flex justify-end gap-2">
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
          </div>
        </PopoverDialog>
      </Popover>
    </PopoverTrigger>
  );
}
