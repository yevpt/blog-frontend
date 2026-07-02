import { Button } from "@repo/ui";
import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import { MAX_QUEUE_BATCH_SIZE } from "../model";

interface ModerationQueueBatchBarProps {
  selectedCount: number;
  isBusy: boolean;
  onApprove: () => Promise<void>;
  onReject: () => void;
  onClear: () => void;
}

export function ModerationQueueBatchBar({
  selectedCount,
  isBusy,
  onApprove,
  onReject,
  onClear,
}: ModerationQueueBatchBarProps) {
  if (selectedCount === 0) return null;

  const overLimit = selectedCount > MAX_QUEUE_BATCH_SIZE;
  const disabled = isBusy || overLimit;

  return (
    <div className="mx-4 mb-3 flex flex-col gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-sm">
        <span className="font-medium text-foreground">已选 {selectedCount} 条</span>
        {overLimit ? (
          <span className="ml-2 text-destructive">超过上限 {MAX_QUEUE_BATCH_SIZE}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <AdminConfirmPopover
          ariaLabel={`批量通过 ${selectedCount} 条待审内容`}
          message={`确认后将通过所选 ${selectedCount} 条待审内容，按当前提交版本对外公开。`}
          confirmLabel="批量通过"
          confirmLoadingLabel="提交中…"
          isConfirming={isBusy}
          popoverClassName="w-72"
          onConfirm={onApprove}
        >
          <Button size="sm" isDisabled={disabled} onClick={(event) => event.stopPropagation()}>
            批量通过
          </Button>
        </AdminConfirmPopover>
        <Button size="sm" variant="outline" isDisabled={disabled} onPress={onReject}>
          批量驳回
        </Button>
        <Button size="sm" variant="ghost" onPress={onClear} isDisabled={isBusy}>
          清除选择
        </Button>
      </div>
    </div>
  );
}
