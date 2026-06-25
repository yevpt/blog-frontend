import { Modal, Button } from "@repo/ui";
import type { FriendLinkRow } from "../model";

interface FriendLinkDeleteDialogProps {
  link: FriendLinkRow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (linkId: string) => Promise<void>;
}

export function FriendLinkDeleteDialog({
  link,
  isDeleting,
  onClose,
  onConfirm,
}: FriendLinkDeleteDialogProps) {
  const open = link !== null;

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isDeleting}
      placement="fullscreen-mobile"
      size="sm"
      aria-label={link ? `删除友链 ${link.name}` : "删除友链"}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">删除「{link?.name ?? ""}」？</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          删除后前台友链页将不再展示该站点，记录会在后台软删除保留。
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
              if (!link) return;
              void onConfirm(link.id).catch(() => undefined);
            }}
          >
            删除
          </Button>
        </div>
      </div>
    </Modal>
  );
}
