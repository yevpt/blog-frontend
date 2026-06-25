import { Button, Modal } from "@repo/ui";

interface MusicDeleteDialogProps {
  title: string;
  description: string;
  open: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function MusicDeleteDialog({
  title,
  description,
  open,
  isDeleting,
  onClose,
  onConfirm,
}: MusicDeleteDialogProps) {
  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isDeleting}
      size="sm"
      aria-label={title}
    >
      <div className="p-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onPress={onClose} isDisabled={isDeleting}>
            取消
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            isLoading={isDeleting}
            loadingText="删除中…"
            onPress={() => {
              void onConfirm();
            }}
          >
            删除
          </Button>
        </div>
      </div>
    </Modal>
  );
}
