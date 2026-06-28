import { useState } from "react";
import { Button, Tooltip, TooltipTrigger, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { ArticleEditorStatusLabel } from "../article-editor-utils";

export type ArticleEditorSavingAction = "draft" | "publish" | "save" | null;

interface ArticleEditorTopBarProps {
  isEditing: boolean;
  statusLabel: ArticleEditorStatusLabel;
  isSaving: boolean;
  disabledReason?: string | null;
  onBack: () => void;
  onSave: () => void;
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

const primaryBtnClassName = cn(
  actionBtnBaseClassName,
  "bg-foreground text-background shadow-none",
  "hover:!bg-foreground hover:!text-background hover:opacity-90",
);

export function ArticleEditorTopBar({
  isEditing,
  statusLabel,
  isSaving,
  disabledReason,
  onBack,
  onSave,
}: ArticleEditorTopBarProps) {
  const [isEncryptedTooltipOpen, setIsEncryptedTooltipOpen] = useState(false);

  const statusText =
    statusLabel === "已发布"
      ? "已发布"
      : statusLabel === "加密"
        ? "加密"
        : statusLabel === "隐藏"
          ? "隐藏"
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
            {statusLabel === "加密" && (
              <Tooltip
                title="当前为加密文章，暂不支持在此页修改或保存；需修改为其他状态后保存。"
                placement="bottom"
                isOpen={isEncryptedTooltipOpen}
                onOpenChange={setIsEncryptedTooltipOpen}
              >
                <TooltipTrigger
                  aria-label="加密状态说明"
                  className="flex cursor-default items-center text-yellow-500 hover:text-yellow-600 transition-colors focus:outline-none"
                  onPress={() => setIsEncryptedTooltipOpen((prev) => !prev)}
                >
                  <SvgIcon name="info-circle" size={14} />
                </TooltipTrigger>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 max-lg:hidden">
        <Tooltip title={disabledReason ?? ""} isDisabled={!disabledReason} delay={0}>
          <Button
            type="button"
            variant="ghost"
            // 取消原生禁用，改用 aria-disabled 保证能正常触发 hover 显示 tooltip
            isDisabled={false}
            isLoading={isSaving}
            aria-disabled={!!disabledReason}
            onPress={disabledReason ? undefined : onSave}
            className={cn(primaryBtnClassName, !!disabledReason && "opacity-50 cursor-not-allowed")}
            // 手动传入 data-disabled 触发 Tailwind 的 data-[disabled] 样式
            data-disabled={!!disabledReason || undefined}
          >
            保存
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
