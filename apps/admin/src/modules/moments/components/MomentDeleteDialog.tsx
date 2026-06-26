import { Button, Modal } from "@repo/ui";
import type { MomentRow } from "../model";

interface MomentDeleteDialogProps {
  moment: MomentRow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (moment: MomentRow) => Promise<void>;
}

export function MomentDeleteDialog({
  moment,
  isDeleting,
  onClose,
  onConfirm,
}: MomentDeleteDialogProps) {
  return (
    <Modal
      isOpen={moment !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isDeleting}
      placement="fullscreen-mobile"
      size="sm"
      aria-label={moment ? `删除动态 ${moment.id}` : "删除动态"}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">删除这条动态？</h2>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {moment?.content ?? ""}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onPress={onClose} isDisabled={isDeleting}>
            取消
          </Button>
          <Button
            variant="default"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            isLoading={isDeleting}
            loadingText="删除中…"
            onPress={() => {
              if (!moment) return;
              void onConfirm(moment).catch(() => undefined);
            }}
          >
            确认删除
          </Button>
        </div>
      </div>
    </Modal>
  );
}
