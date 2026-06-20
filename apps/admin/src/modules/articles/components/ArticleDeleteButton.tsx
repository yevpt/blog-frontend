import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, Popover, PopoverDialog, PopoverTrigger } from "@repo/ui";
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
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
      <Popover placement="bottom end" offset={6} className="w-64">
        <PopoverDialog aria-label={`确认删除「${article.title}」`} className="p-3 outline-none">
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-foreground">
              确定删除这篇文章吗？文章将移入已删除状态。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" slot="close" isDisabled={isDeleting}>
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                isDisabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onPress={() => {
                  void onConfirmDelete(article.id)
                    .then(() => {
                      setIsOpen(false);
                    })
                    .catch(() => undefined);
                }}
              >
                {isDeleting ? "删除中..." : "删除"}
              </Button>
            </div>
          </div>
        </PopoverDialog>
      </Popover>
    </PopoverTrigger>
  );
}
