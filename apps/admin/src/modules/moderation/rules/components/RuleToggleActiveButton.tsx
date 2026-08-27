import { AdminConfirmPopover } from "../../../../components/AdminConfirmPopover";
import { AdminRowAction } from "../../../../components/AdminRowAction";
import type { RuleRow } from "../model";

interface RuleToggleActiveButtonProps {
  row: RuleRow;
  isSubmitting: boolean;
  className?: string;
  onConfirm: (row: RuleRow) => Promise<void>;
}

export function RuleToggleActiveButton({
  row,
  isSubmitting,
  className,
  onConfirm,
}: RuleToggleActiveButtonProps) {
  const action = row.active ? "停用" : "启用";
  const pattern = row.pattern || row.name || `#${row.id}`;

  return (
    <AdminConfirmPopover
      ariaLabel={`确认${action}规则 #${row.id}`}
      message={`确定${action}规则 #${row.id}（${pattern}）？提交后将构建候选规则集，当前线上版本在发布成功前保持不变。`}
      confirmLabel={action}
      confirmLoadingLabel="提交中…"
      isConfirming={isSubmitting}
      popoverClassName="w-72"
      onConfirm={() => onConfirm(row)}
    >
      <AdminRowAction
        type="button"
        tone={row.active ? "destructive" : "neutral"}
        className={className}
        onClick={(event) => event.stopPropagation()}
      >
        {action}
      </AdminRowAction>
    </AdminConfirmPopover>
  );
}
