import { Button } from "@repo/ui";
import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";

interface MusicDeleteButtonProps {
  ariaLabel: string;
  message: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  className?: string;
}

export function MusicDeleteButton({
  ariaLabel,
  message,
  isDeleting,
  onConfirm,
  className,
}: MusicDeleteButtonProps) {
  return (
    <AdminConfirmPopover
      ariaLabel={ariaLabel}
      message={message}
      confirmLabel="删除"
      confirmLoadingLabel="删除中…"
      isConfirming={isDeleting}
      destructive
      onConfirm={onConfirm}
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={
          className ??
          "h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        }
        onClick={(event) => event.stopPropagation()}
      >
        删除
      </Button>
    </AdminConfirmPopover>
  );
}
