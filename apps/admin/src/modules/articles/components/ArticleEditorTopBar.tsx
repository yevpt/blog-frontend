import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { ArticleEditorStatusLabel } from "../article-editor-utils";

export type ArticleEditorSavingAction = "draft" | "publish" | null;

interface ArticleEditorTopBarProps {
  isEditing: boolean;
  statusLabel: ArticleEditorStatusLabel;
  savingAction: ArticleEditorSavingAction;
  saveDisabled: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

const topBarShellClassName = cn(
  "sticky top-0 z-30 grid gap-3 bg-background/90 pb-3 backdrop-blur-md",
  "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:justify-between sm:gap-5",
);

const iconBtnClassName = cn(
  "size-[34px] min-h-[34px] shrink-0 rounded-md border-0 bg-card p-0 text-muted-foreground shadow-card",
  "transition-opacity hover:bg-card hover:text-foreground hover:opacity-90",
);

const actionBtnBaseClassName = cn(
  "h-[34px] min-h-[34px] shrink-0 rounded-md border-0 px-[15px] text-[13px] font-semibold",
  "transition-[opacity,transform] duration-150",
);

const secondaryBtnClassName = cn(
  actionBtnBaseClassName,
  "bg-card text-foreground shadow-card",
  "hover:!bg-card hover:!text-foreground hover:opacity-90",
);

const primaryBtnClassName = cn(
  actionBtnBaseClassName,
  "bg-foreground text-background shadow-none",
  "hover:!bg-foreground hover:!text-background hover:opacity-90",
);

export function ArticleEditorTopBar({
  isEditing,
  statusLabel,
  savingAction,
  saveDisabled,
  onBack,
  onSaveDraft,
  onPublish,
}: ArticleEditorTopBarProps) {
  const isSaving = savingAction !== null;

  const statusText =
    statusLabel === "已发布"
      ? "已发布"
      : statusLabel === "加密"
        ? "加密"
        : isSaving
          ? "草稿 · 保存中…"
          : "草稿 · 尚未保存";

  return (
    <header className={topBarShellClassName}>
      <div className="flex min-w-0 items-center gap-3 pr-14 sm:pr-0">
        <Button
          type="button"
          variant="ghost"
          aria-label="返回文章列表"
          onPress={onBack}
          className={iconBtnClassName}
        >
          <SvgIcon name="arrow-back" size={16} />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-8 tracking-normal text-foreground sm:text-2xl">
            {isEditing ? "编辑文章" : "新建文章"}
          </h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full bg-muted-foreground",
                statusLabel === "已发布" && "bg-green-600 shadow-[0_0_0_3px] shadow-green-600/15",
              )}
              aria-hidden
            />
            <span>{statusText}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-2">
        <Button
          type="button"
          variant="ghost"
          isDisabled={saveDisabled}
          isLoading={savingAction === "draft"}
          onPress={onSaveDraft}
          className={secondaryBtnClassName}
        >
          存草稿
        </Button>
        <Button
          type="button"
          variant="ghost"
          isDisabled={saveDisabled}
          isLoading={savingAction === "publish"}
          onPress={onPublish}
          className={primaryBtnClassName}
        >
          发布
        </Button>
      </div>
    </header>
  );
}
