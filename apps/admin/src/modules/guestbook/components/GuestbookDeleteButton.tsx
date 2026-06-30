import { Button } from "@repo/ui";
import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import type { GuestbookRow } from "../model";

interface GuestbookDeleteButtonProps {
  message: GuestbookRow;
  isDeleting: boolean;
  onConfirm: (message: GuestbookRow) => Promise<void>;
  className?: string;
}

export function GuestbookDeleteButton({
  message,
  isDeleting,
  onConfirm,
  className,
}: GuestbookDeleteButtonProps) {
  return (
    <AdminConfirmPopover
      ariaLabel={`确认删除留言 ${message.id}`}
      message={
        <>
          确定删除这条留言吗？
          <span className="mt-2 block line-clamp-3 text-muted-foreground">{message.content}</span>
        </>
      }
      confirmLabel="确认删除"
      confirmLoadingLabel="删除中…"
      isConfirming={isDeleting}
      destructive
      onConfirm={() => onConfirm(message)}
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
