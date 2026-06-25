import { SvgIcon } from "@repo/icons";
import { Badge, cn } from "@repo/ui";

interface CategoryVisualAssetsPlaceholderProps {
  iconUrl?: string;
  coverUrl?: string;
}

interface AssetSlotProps {
  label: string;
  previewUrl?: string;
  variant: "icon" | "cover";
}

function AssetSlot({ label, previewUrl, variant }: AssetSlotProps) {
  const isIcon = variant === "icon";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-dashed border-border/80",
        "bg-muted/20 px-2.5 py-2",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md",
          "border border-border/70 bg-background/80",
          isIcon ? "size-9" : "h-9 w-14",
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className={cn("object-cover opacity-70 grayscale", isIcon ? "size-full" : "h-full w-full")}
          />
        ) : (
          <SvgIcon
            name={isIcon ? "image" : "folder"}
            size={isIcon ? 16 : 18}
            className="text-muted-foreground/70"
          />
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground/85">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">可选 · 暂不可编辑</p>
      </div>
    </div>
  );
}

/** 图标与封面配置占位：后端能力未就绪，紧凑展示说明与已有素材预览。 */
export function CategoryVisualAssetsPlaceholder({
  iconUrl,
  coverUrl,
}: CategoryVisualAssetsPlaceholderProps) {
  const hasExistingAssets = Boolean(iconUrl || coverUrl);

  return (
    <section
      aria-label="视觉素材配置"
      className="min-w-0 overflow-hidden rounded-xl border border-border/80 bg-muted/10 px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">视觉素材</p>
        <Badge
          variant="outline"
          className="h-5 shrink-0 border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] text-amber-700 dark:text-amber-300"
        >
          开发中
        </Badge>
      </div>

      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
        图标与封面尚未开放配置，当前仅支持名称、别名与排序。
        {hasExistingAssets ? " 已有历史素材，待后端支持后可编辑。" : null}
      </p>

      <div className="mt-2.5 flex min-w-0 gap-2">
        <AssetSlot variant="icon" label="分类图标" previewUrl={iconUrl} />
        <AssetSlot variant="cover" label="分类封面" previewUrl={coverUrl} />
      </div>
    </section>
  );
}
