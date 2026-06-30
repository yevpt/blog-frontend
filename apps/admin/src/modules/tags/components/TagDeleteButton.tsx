import { Button } from "@repo/ui";
import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import type { TagRow } from "../model";

interface TagDeleteButtonProps {
  tag: TagRow;
  isDeleting: boolean;
  onConfirm: (tagId: string) => Promise<void>;
  className?: string;
}

export function TagDeleteButton({ tag, isDeleting, onConfirm, className }: TagDeleteButtonProps) {
  const hasArticles = tag.articleCount > 0;

  return (
    <AdminConfirmPopover
      ariaLabel={`确认删除「${tag.name}」`}
      message={
        hasArticles
          ? `确定删除标签「${tag.name}」？该标签关联了 ${tag.articleCount} 篇公开文章，删除后这些文章将不再带有此标签，文章本身不会被删除。`
          : `确定删除标签「${tag.name}」？删除后无法恢复。`
      }
      confirmLabel="删除"
      confirmLoadingLabel="删除中…"
      isConfirming={isDeleting}
      destructive
      onConfirm={() => onConfirm(tag.id)}
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={
          className ??
          "h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        }
        onClick={(event) => event.stopPropagation()}
      >
        删除
      </Button>
    </AdminConfirmPopover>
  );
}
