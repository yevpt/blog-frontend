import { Button } from "@repo/ui";
import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import type { CommentRow } from "../model";

interface CommentDeleteButtonProps {
  comment: CommentRow;
  isDeleting: boolean;
  onConfirm: (comment: CommentRow) => Promise<void>;
  className?: string;
}

export function CommentDeleteButton({
  comment,
  isDeleting,
  onConfirm,
  className,
}: CommentDeleteButtonProps) {
  return (
    <AdminConfirmPopover
      ariaLabel={`确认删除评论 ${comment.id}`}
      message={
        <>
          确定删除这条评论吗？
          <span className="mt-2 block line-clamp-3 text-muted-foreground">{comment.content}</span>
        </>
      }
      confirmLabel="确认删除"
      confirmLoadingLabel="删除中…"
      isConfirming={isDeleting}
      destructive
      onConfirm={() => onConfirm(comment)}
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
