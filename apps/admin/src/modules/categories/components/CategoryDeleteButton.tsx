import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import { AdminRowAction } from "../../../components/AdminRowAction";
import type { CategoryRow } from "../model";

interface CategoryDeleteButtonProps {
  category: CategoryRow;
  isDeleting: boolean;
  onConfirm: (categoryId: string) => Promise<void>;
  className?: string;
}

export function CategoryDeleteButton({
  category,
  isDeleting,
  onConfirm,
  className,
}: CategoryDeleteButtonProps) {
  const hasArticles = category.articleCount > 0;

  return (
    <AdminConfirmPopover
      ariaLabel={`确认删除「${category.name}」`}
      message={
        hasArticles
          ? `确定删除分类「${category.name}」？该分类下有 ${category.articleCount} 篇文章，删除后这些文章将变为未分类，文章本身不会被删除。`
          : `确定删除分类「${category.name}」？删除后无法恢复。`
      }
      confirmLabel="删除"
      confirmLoadingLabel="删除中…"
      isConfirming={isDeleting}
      destructive
      onConfirm={() => onConfirm(category.id)}
    >
      <AdminRowAction
        type="button"
        tone="destructive"
        className={className}
        onClick={(event) => event.stopPropagation()}
      >
        删除
      </AdminRowAction>
    </AdminConfirmPopover>
  );
}
