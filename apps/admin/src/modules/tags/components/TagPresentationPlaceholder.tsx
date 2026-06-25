import { SvgIcon } from "@repo/icons";
import { Badge, cn } from "@repo/ui";

interface TagPresentationPlaceholderProps {
  iconUrl?: string;
  coverUrl?: string;
  description?: string;
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

/** 展示设置占位：上传与编辑能力未就绪，仅预览已有素材。 */
export function TagPresentationPlaceholder({
  iconUrl,
  coverUrl,
  description,
}: TagPresentationPlaceholderProps) {
  const hasExistingAssets = Boolean(iconUrl || coverUrl || description);

  return (
    <div className="grid gap-3 border-t border-border/70 px-3 py-4">
      <p className="text-[11px] leading-5 text-muted-foreground">
        图标、封面与描述尚未开放配置，当前仅支持名称、别名与排序。
        {hasExistingAssets ? " 已有历史数据，待功能完善后可编辑。" : null}
      </p>

      <div className="flex min-w-0 gap-2">
        <AssetSlot variant="icon" label="标签图标" previewUrl={iconUrl} />
        <AssetSlot variant="cover" label="标签封面" previewUrl={coverUrl} />
      </div>

      <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2.5">
        <p className="text-xs font-medium text-foreground/85">标签描述</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          {description?.trim() ? description : "暂无描述 · 暂不可编辑"}
        </p>
      </div>
    </div>
  );
}
