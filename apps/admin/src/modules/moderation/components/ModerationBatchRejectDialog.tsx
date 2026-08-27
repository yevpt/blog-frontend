import { useEffect, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, Label, Modal, cn } from "@repo/ui";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
  adminDialogTextareaClassName,
} from "../../../components/AdminDialog";

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
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="批量审核"
          title="批量驳回"
          description={`将为所选 ${selectedCount} 条待审内容应用同一条驳回理由。`}
          action={
            <ButtonUtility
              tooltip="关闭批量驳回"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isSaving}
              onClick={onClose}
            />
          }
        />

        <AdminDialogBody contentClassName="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="batch-reject-reason">驳回理由</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {reason.length.toLocaleString()} 字
            </span>
          </div>
          <textarea
            id="batch-reject-reason"
            aria-label="批量驳回理由"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={cn(adminDialogTextareaClassName, "min-h-32")}
            placeholder="清楚说明驳回原因；该内容会写入每条审核记录…"
          />
          {validationError ? (
            <p role="alert" className="text-sm text-destructive">
              {validationError}
            </p>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              建议写明命中的规则或需要修改的内容，方便作者理解。
            </p>
          )}
        </AdminDialogBody>

        <AdminDialogFooter>
          <Button variant="outline" onPress={onClose} isDisabled={isSaving}>
            取消
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
            onPress={() => void handleSubmit()}
            isLoading={isSaving}
            loadingText="提交中…"
          >
            确认驳回
          </Button>
        </AdminDialogFooter>
      </AdminDialogFrame>
    </Modal>
  );
}
