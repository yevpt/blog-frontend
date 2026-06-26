import { Button, Modal } from "@repo/ui";
import type { CommentRow } from "../model";

interface CommentDeleteDialogProps {
  comment: CommentRow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (comment: CommentRow) => Promise<void>;
}

export function CommentDeleteDialog({
  comment,
  isDeleting,
  onClose,
  onConfirm,
}: CommentDeleteDialogProps) {
  return (
    <Modal
      isOpen={comment !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isDeleting}
      placement="fullscreen-mobile"
      size="sm"
      aria-label={comment ? `删除评论 ${comment.id}` : "删除评论"}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">删除这条评论？</h2>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {comment?.content ?? ""}
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
              if (!comment) return;
              void onConfirm(comment).catch(() => undefined);
            }}
          >
            确认删除
          </Button>
        </div>
      </div>
    </Modal>
  );
}
