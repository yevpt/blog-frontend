import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import { AdminRowAction } from "../../../components/AdminRowAction";
import type { FriendLinkRow } from "../model";

interface FriendLinkDeleteButtonProps {
  link: FriendLinkRow;
  isDeleting: boolean;
  onConfirm: (linkId: string) => Promise<void>;
  className?: string;
}

export function FriendLinkDeleteButton({
  link,
  isDeleting,
  onConfirm,
  className,
}: FriendLinkDeleteButtonProps) {
  return (
    <AdminConfirmPopover
      ariaLabel={`确认删除「${link.name}」`}
      message={`确定删除友链「${link.name}」？删除后前台友链页将不再展示该站点，记录会在后台软删除保留。`}
      confirmLabel="删除"
      confirmLoadingLabel="删除中…"
      isConfirming={isDeleting}
      destructive
      onConfirm={() => onConfirm(link.id)}
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
