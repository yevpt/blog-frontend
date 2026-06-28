import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";

/** 封面预览浮层上的紧凑操作钮，对齐推荐稿 chip-btn（26px 高、11px 字） */
const coverChipClassName = cn(
  "inline-flex h-[26px] w-auto shrink-0 items-center justify-center rounded-md px-2.5 py-0",
  "text-[11px] font-semibold leading-none shadow-none",
  "bg-black/55 text-white backdrop-blur-sm",
  "hover:bg-black/70 hover:text-white",
  "focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-offset-0",
);

interface ArticleCoverPreviewProps {
  coverUrl: string;
  isCoverUploading: boolean;
  onPickCover: () => void;
  onRemoveCover: () => void;
  /** 预览区宽高比，默认 16:9。 */
  aspectRatio?: "video" | "9/16";
  previewAlt?: string;
  addLabel?: string;
  uploadingLabel?: string;
  loadingLabel?: string;
}

function CoverBusyOverlay({ label }: { label: string }) {
  return (
    <div
      aria-label={label}
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/60"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
      />
    </div>
  );
}

/** 封面预览：上传 API 返回后仍保持加载态，直到新 URL 的图片解码完成。 */
export function ArticleCoverPreview({
  coverUrl,
  isCoverUploading,
  onPickCover,
  onRemoveCover,
  aspectRatio = "video",
  previewAlt = "文章封面预览",
  addLabel = "添加封面",
  uploadingLabel = "封面上传中",
  loadingLabel = "封面加载中",
}: ArticleCoverPreviewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const markImageLoading = useCallback(() => {
    setIsImageLoading(true);
  }, []);

  const markImageReady = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  useLayoutEffect(() => {
    if (!coverUrl) {
      markImageReady();
      return;
    }

    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      markImageReady();
      return;
    }

    markImageLoading();
  }, [coverUrl, markImageLoading, markImageReady]);

  const isCoverBusy = isCoverUploading || (!!coverUrl && isImageLoading);
  const busyLabel = isCoverUploading ? uploadingLabel : loadingLabel;
  const aspectClassName = aspectRatio === "9/16" ? "aspect-[9/16]" : "aspect-video";

  return (
    <div
      aria-busy={isCoverBusy}
      className={cn("relative overflow-hidden rounded-lg bg-muted shadow-card", aspectClassName)}
    >
      {coverUrl ? (
        <img
          ref={imgRef}
          src={coverUrl}
          alt={previewAlt}
          onLoad={markImageReady}
          onError={markImageReady}
          className={cn(
            "size-full object-cover transition-opacity duration-300",
            isCoverBusy ? "opacity-0" : "opacity-100",
          )}
        />
      ) : (
        <button
          type="button"
          aria-label={addLabel}
          disabled={isCoverUploading}
          onClick={onPickCover}
          className={cn(
            "flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors",
            "hover:bg-muted/70 hover:text-foreground disabled:cursor-wait disabled:opacity-60",
          )}
        >
          <SvgIcon name="image" size={20} />
          <span className="text-xs font-medium">{addLabel}</span>
        </button>
      )}

      {coverUrl && !isCoverBusy ? (
        <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1">
          <Button
            type="button"
            variant="text"
            size="sm"
            onPress={onPickCover}
            className={coverChipClassName}
          >
            更换
          </Button>
          <Button
            type="button"
            variant="text"
            size="sm"
            onPress={onRemoveCover}
            className={coverChipClassName}
          >
            移除
          </Button>
        </div>
      ) : null}

      {isCoverBusy ? <CoverBusyOverlay label={busyLabel} /> : null}
    </div>
  );
}
