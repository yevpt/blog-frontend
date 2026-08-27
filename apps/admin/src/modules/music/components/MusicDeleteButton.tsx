import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import { AdminRowAction } from "../../../components/AdminRowAction";

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
      <AdminRowAction
        type="button"
        tone="destructive"
        className={className}
        onClick={(event) => event.stopPropagation()}
      >
        删除
      </AdminRowAction>
    </AdminConfirmPopover>
  );
}
