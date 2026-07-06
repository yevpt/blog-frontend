import type { ChangeEvent, RefObject } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import type { CategoryAssetValue } from "../model";
import { CategoryIconPreview } from "./CategoryIconPreview";

interface CategoryVisualAssetsEditorProps {
  icon: CategoryAssetValue;
  cover: CategoryAssetValue;
  isIconUploading: boolean;
  isCoverUploading: boolean;
  uploadError: string | null;
  onIconPick: () => void;
  onCoverPick: () => void;
  onIconRemove: () => void;
  onCoverRemove: () => void;
}

interface AssetSlotEditorProps {
  label: string;
  hint: string;
  previewAlt: string;
  variant: "icon" | "cover";
  asset: CategoryAssetValue;
  isUploading: boolean;
  onPick: () => void;
  onRemove: () => void;
}

function AssetBusyOverlay({ label }: { label: string }) {
  return (
    <div
      aria-label={label}
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/60"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
      />
    </div>
  );
}

/** 封面预览浮层操作钮，对齐文章封面 chip 样式 */
const coverChipClassName = cn(
  "inline-flex h-[26px] w-auto shrink-0 items-center justify-center rounded-md px-2.5 py-0",
  "whitespace-nowrap text-[11px] font-semibold leading-none shadow-none",
  "bg-black/55 text-white backdrop-blur-sm",
  "hover:bg-black/70 hover:text-white",
  "focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-offset-0",
);

const iconActionClassName = cn(
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md px-2",
  "whitespace-nowrap text-[11px] font-medium leading-none",
  "text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
);

interface AssetPreviewActionsProps {
  variant: "icon" | "cover";
  onPick: () => void;
  onRemove: () => void;
}

function AssetPreviewActions({ variant, onPick, onRemove }: AssetPreviewActionsProps) {
  if (variant === "icon") {
    return (
      <div className="flex w-[88px] items-center justify-between gap-1">
        <button type="button" className={iconActionClassName} onClick={onPick}>
          更换
        </button>
        <button
          type="button"
          className={cn(iconActionClassName, "hover:text-destructive")}
          onClick={onRemove}
        >
          移除
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1">
      <Button
        type="button"
        variant="text"
        size="sm"
        onPress={onPick}
        className={coverChipClassName}
      >
        更换
      </Button>
      <Button
        type="button"
        variant="text"
        size="sm"
        onPress={onRemove}
        className={coverChipClassName}
      >
        移除
      </Button>
    </div>
  );
}

function AssetSlotEditor({
  label,
  hint,
  previewAlt,
  variant,
  asset,
  isUploading,
  onPick,
  onRemove,
}: AssetSlotEditorProps) {
  const isIcon = variant === "icon";
  const hasPreview = Boolean(asset.previewUrl);

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", isIcon ? "w-[88px] shrink-0" : "flex-1")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <span className="text-[11px] text-muted-foreground">可选</span>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-dashed border-border/80 bg-muted/20",
          isIcon ? "aspect-square size-[88px]" : "aspect-video",
        )}
      >
        {hasPreview ? (
          isIcon ? (
            <CategoryIconPreview
              url={asset.previewUrl}
              alt={previewAlt}
              className={cn("size-full object-contain p-1.5", isUploading && "opacity-40")}
            />
          ) : (
            <img
              src={asset.previewUrl}
              alt={previewAlt}
              className={cn("size-full object-cover", isUploading && "opacity-40")}
            />
          )
        ) : (
          <button
            type="button"
            disabled={isUploading}
            onClick={onPick}
            className={cn(
              "flex size-full flex-col items-center justify-center gap-1 text-muted-foreground transition-colors",
              "hover:bg-muted/40 hover:text-foreground disabled:cursor-wait disabled:opacity-60",
            )}
          >
            <SvgIcon name="image" size={isIcon ? 18 : 20} />
            <span className="text-[11px] font-medium">上传</span>
          </button>
        )}

        {hasPreview && !isUploading && !isIcon ? (
          <AssetPreviewActions variant="cover" onPick={onPick} onRemove={onRemove} />
        ) : null}

        {isUploading ? <AssetBusyOverlay label={`${label}上传中`} /> : null}
      </div>

      {hasPreview && !isUploading && isIcon ? (
        <AssetPreviewActions variant="icon" onPick={onPick} onRemove={onRemove} />
      ) : null}

      <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

/** 分类图标与封面编辑区 */
export function CategoryVisualAssetsEditor({
  icon,
  cover,
  isIconUploading,
  isCoverUploading,
  uploadError,
  onIconPick,
  onCoverPick,
  onIconRemove,
  onCoverRemove,
}: CategoryVisualAssetsEditorProps) {
  return (
    <section
      aria-label="视觉素材配置"
      className="min-w-0 overflow-hidden rounded-xl border border-border/80 bg-muted/10 px-3 py-3"
    >
      <p className="text-sm font-medium text-foreground">视觉素材</p>

      <div className="mt-3 flex min-w-0 flex-col gap-4 sm:flex-row">
        <AssetSlotEditor
          variant="icon"
          label="分类图标"
          hint="SVG，最大 256 KB"
          previewAlt="分类图标预览"
          asset={icon}
          isUploading={isIconUploading}
          onPick={onIconPick}
          onRemove={onIconRemove}
        />
        <AssetSlotEditor
          variant="cover"
          label="分类封面"
          hint="常见位图格式，上传前自动压缩"
          previewAlt="分类封面预览"
          asset={cover}
          isUploading={isCoverUploading}
          onPick={onCoverPick}
          onRemove={onCoverRemove}
        />
      </div>

      {uploadError ? <p className="mt-2 text-sm text-destructive">{uploadError}</p> : null}
    </section>
  );
}

/** 供表单挂载隐藏 file input */
export function CategoryAssetFileInputs({
  iconInputRef,
  coverInputRef,
  onIconChange,
  onCoverChange,
}: {
  iconInputRef: RefObject<HTMLInputElement | null>;
  coverInputRef: RefObject<HTMLInputElement | null>;
  onIconChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCoverChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <input
        ref={iconInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="sr-only"
        aria-label="上传分类图标"
        onChange={onIconChange}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-label="上传分类封面"
        onChange={onCoverChange}
      />
    </>
  );
}
