import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import { AdminRowAction } from "../../../components/AdminRowAction";
import type { MomentRow } from "../model";

interface MomentDeleteButtonProps {
  moment: MomentRow;
  isDeleting: boolean;
  onConfirm: (moment: MomentRow) => Promise<void>;
  className?: string;
}

export function MomentDeleteButton({
  moment,
  isDeleting,
  onConfirm,
  className,
}: MomentDeleteButtonProps) {
  return (
    <AdminConfirmPopover
      ariaLabel={`确认删除碎语 ${moment.id}`}
      message={
        <>
          确定删除这条碎语吗？
          <span className="mt-2 block line-clamp-3 text-muted-foreground">{moment.content}</span>
        </>
      }
      confirmLabel="确认删除"
      confirmLoadingLabel="删除中…"
      isConfirming={isDeleting}
      destructive
      onConfirm={() => onConfirm(moment)}
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
