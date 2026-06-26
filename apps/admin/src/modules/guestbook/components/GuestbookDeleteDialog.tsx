import { Button, Modal } from "@repo/ui";
import type { GuestbookRow } from "../model";

interface GuestbookDeleteDialogProps {
  message: GuestbookRow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (message: GuestbookRow) => Promise<void>;
}

export function GuestbookDeleteDialog({
  message,
  isDeleting,
  onClose,
  onConfirm,
}: GuestbookDeleteDialogProps) {
  return (
    <Modal
      isOpen={message !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isDeleting}
      placement="fullscreen-mobile"
      size="sm"
      aria-label={message ? `删除留言 ${message.id}` : "删除留言"}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">删除这条留言？</h2>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {message?.content ?? ""}
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
              if (!message) return;
              void onConfirm(message).catch(() => undefined);
            }}
          >
            确认删除
          </Button>
        </div>
      </div>
    </Modal>
  );
}
