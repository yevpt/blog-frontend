import { Modal, Button } from "@repo/ui";
import type { TagRow } from "../model";

interface TagDeleteDialogProps {
  tag: TagRow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (tagId: string) => Promise<void>;
}

export function TagDeleteDialog({ tag, isDeleting, onClose, onConfirm }: TagDeleteDialogProps) {
  const open = tag !== null;
  const hasArticles = (tag?.articleCount ?? 0) > 0;

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isDeleting}
      placement="fullscreen-mobile"
      size="sm"
      aria-label={tag ? `删除标签 ${tag.name}` : "删除标签"}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">删除「{tag?.name ?? ""}」？</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {hasArticles
            ? `该标签关联了 ${tag?.articleCount} 篇公开文章。删除后这些文章将不再带有此标签，文章本身不会被删除。`
            : "删除后无法恢复，确定继续吗？"}
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
              if (!tag) return;
              void onConfirm(tag.id).catch(() => undefined);
            }}
          >
            删除
          </Button>
        </div>
      </div>
    </Modal>
  );
}
