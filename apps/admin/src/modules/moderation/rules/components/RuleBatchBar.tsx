import { Button } from "@repo/ui";
import { AdminConfirmPopover } from "../../../../components/AdminConfirmPopover";

const MAX_BATCH = 1000;

interface RuleBatchBarProps {
  selectedCount: number;
  isBusy: boolean;
  candidateBlocking: boolean;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  onClear: () => void;
}

export function RuleBatchBar({
  selectedCount,
  isBusy,
  candidateBlocking,
  onEnable,
  onDisable,
  onClear,
}: RuleBatchBarProps) {
  if (selectedCount === 0) return null;

  const overLimit = selectedCount > MAX_BATCH;
  const disabled = isBusy || candidateBlocking || overLimit;

  return (
    <div className="mx-4 mb-3 flex flex-col gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-sm">
        <span className="font-medium text-foreground">已选 {selectedCount} 条</span>
        {overLimit ? <span className="ml-2 text-destructive">超过上限 {MAX_BATCH}</span> : null}
        {candidateBlocking ? (
          <p className="text-xs text-muted-foreground">候选规则集处理中，暂不可批量操作</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <AdminConfirmPopover
          ariaLabel={`批量启用 ${selectedCount} 条规则`}
          message={`确认后将启用所选 ${selectedCount} 条规则并构建候选规则集，当前线上版本在发布成功前保持不变。`}
          confirmLabel="批量启用"
          confirmLoadingLabel="提交中…"
          isConfirming={isBusy}
          popoverClassName="w-72"
          onConfirm={onEnable}
        >
          <Button size="sm" isDisabled={disabled} onClick={(event) => event.stopPropagation()}>
            批量启用
          </Button>
        </AdminConfirmPopover>
        <AdminConfirmPopover
          ariaLabel={`批量停用 ${selectedCount} 条规则`}
          message={`确认后将停用所选 ${selectedCount} 条规则并构建候选规则集，当前线上版本在发布成功前保持不变。`}
          confirmLabel="批量停用"
          confirmLoadingLabel="提交中…"
          isConfirming={isBusy}
          popoverClassName="w-72"
          onConfirm={onDisable}
        >
          <Button
            size="sm"
            variant="outline"
            isDisabled={disabled}
            onClick={(event) => event.stopPropagation()}
          >
            批量停用
          </Button>
        </AdminConfirmPopover>
        <Button size="sm" variant="ghost" onPress={onClear} isDisabled={isBusy}>
          清除选择
        </Button>
      </div>
    </div>
  );
}
