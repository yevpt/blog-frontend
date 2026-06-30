import { SvgIcon } from "@repo/icons";
import { ButtonUtility } from "@repo/ui";
import { AdminConfirmPopover } from "../../../components/AdminConfirmPopover";
import type { ArticleRow } from "../model";

interface ArticleDeleteButtonProps {
  article: ArticleRow;
  isDeleting: boolean;
  onConfirmDelete: (articleId: string) => Promise<void>;
}

export function ArticleDeleteButton({
  article,
  isDeleting,
  onConfirmDelete,
}: ArticleDeleteButtonProps) {
  return (
    <AdminConfirmPopover
      ariaLabel={`确认删除「${article.title}」`}
      message="确定删除这篇文章吗？文章将移入已删除状态。"
      confirmLabel="删除"
      confirmLoadingLabel="删除中..."
      isConfirming={isDeleting}
      destructive
      onConfirm={() => onConfirmDelete(article.id)}
    >
      <ButtonUtility
        aria-label="删除文章"
        type="button"
        size="sm"
        color="tertiary"
        icon={
          <span className="text-destructive">
            <SvgIcon name="trash" size={18} />
          </span>
        }
        onClick={(event) => event.stopPropagation()}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      />
    </AdminConfirmPopover>
  );
}
