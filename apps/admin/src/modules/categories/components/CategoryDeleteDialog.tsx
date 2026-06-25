import { Modal, Button } from "@repo/ui";
import type { CategoryRow } from "../model";

interface CategoryDeleteDialogProps {
  category: CategoryRow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (categoryId: string) => Promise<void>;
}

export function CategoryDeleteDialog({
  category,
  isDeleting,
  onClose,
  onConfirm,
}: CategoryDeleteDialogProps) {
  const open = category !== null;
  const hasArticles = (category?.articleCount ?? 0) > 0;

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isDeleting}
      placement="fullscreen-mobile"
      size="sm"
      aria-label={category ? `删除分类 ${category.name}` : "删除分类"}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">
          删除「{category?.name ?? ""}」？
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {hasArticles
            ? `该分类下有 ${category?.articleCount} 篇文章。删除后这些文章将变为未分类，文章本身不会被删除。`
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
              if (!category) return;
              void onConfirm(category.id).catch(() => undefined);
            }}
          >
            删除
          </Button>
        </div>
      </div>
    </Modal>
  );
}
