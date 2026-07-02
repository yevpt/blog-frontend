import { useEffect, useState } from "react";
import { Button, Modal } from "@repo/ui";

interface ModerationBatchRejectDialogProps {
  open: boolean;
  selectedCount: number;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export function ModerationBatchRejectDialog({
  open,
  selectedCount,
  isSaving,
  onClose,
  onSubmit,
}: ModerationBatchRejectDialogProps) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setValidationError(null);
  }, [open]);

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError("驳回必须填写理由");
      return;
    }
    setValidationError(null);
    await onSubmit(trimmed);
  }

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next && !isSaving) onClose();
      }}
      isDismissable={!isSaving}
      size="md"
      aria-label="批量驳回"
    >
      <div className="p-5">
        <h2 className="text-lg font-semibold text-foreground">批量驳回</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          将为所选 {selectedCount} 条待审内容填写统一驳回理由。
        </p>
        <label className="mt-4 grid gap-1.5 text-sm">
          <span className="font-medium text-foreground">驳回理由</span>
          <textarea
            aria-label="批量驳回理由"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="说明驳回原因，将应用于全部选中项"
          />
        </label>
        {validationError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {validationError}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onPress={onClose} isDisabled={isSaving}>
            取消
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onPress={() => void handleSubmit()}
            isDisabled={isSaving}
          >
            {isSaving ? "提交中…" : "确认驳回"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
