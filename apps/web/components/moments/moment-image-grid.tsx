"use client";

import type { MomentItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import { DeferredNativeImage, LoadingImage } from "@/components/common/loading-image";

type MomentImage = NonNullable<MomentItemResp["images"]>[number];

interface MomentImageGridProps {
  images: MomentImage[];
  /** 点击第 index 张（从 0 起）时回调，用于打开全屏画廊 */
  onOpen: (index: number) => void;
}

/** 最多展示的格子数，超出在最后一格叠加 +N */
const MAX_VISIBLE = 9;

/**
 * 微博/微信风格的列数规则：2、4 张用两列，其余（3、5–9 张）用三列。
 * 单图不走网格，单独按原始宽高比展示。
 */
function gridColumns(count: number): 2 | 3 {
  return count === 2 || count === 4 ? 2 : 3;
}

function isGifImage(img: MomentImage): boolean {
  const fileType = img.file_type.toLowerCase();
  const name = img.name.toLowerCase();
  const url = img.access_url.toLowerCase().split(/[?#]/, 1)[0] ?? "";
  return (
    fileType === "gif" || fileType === "image/gif" || name.endsWith(".gif") || url.endsWith(".gif")
  );
}

/** 仅 original 可进入图片查看器 */
function isViewable(img: MomentImage): boolean {
  return img.display_mode === "original";
}

/** 在全部图片中的下标 → 仅对 original 计数的查看器索引 */
function getViewerIndex(images: MomentImage[], imageIndex: number): number {
  return images.slice(0, imageIndex).filter(isViewable).length;
}

/** gif_placeholder 不走 DeferredNativeImage，即使文件类型为 GIF */
function shouldDeferGif(img: MomentImage): boolean {
  return img.display_mode !== "gif_placeholder" && isGifImage(img);
}

/**
 * 碎语图片九宫格。
 * - 单图：保留原始宽高比、限制最大高度，不裁剪。
 * - 多图：等大正方形格子 + object-cover 裁剪，低宽度下也不会变形。
 */
export function MomentImageGrid({ images, onOpen }: MomentImageGridProps) {
  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    const img = images[0]!;
    const imageNode = shouldDeferGif(img) ? (
      <DeferredNativeImage
        src={img.access_url}
        alt={img.name}
        className="block h-auto max-h-[320px] w-auto max-w-full object-contain"
        skeletonClassName="rounded-[6px]"
      />
    ) : (
      <LoadingImage
        src={img.access_url}
        alt={img.name}
        width={0}
        height={0}
        fallbackUnoptimized
        sizes="(max-width: 768px) 90vw, 480px"
        className="block h-auto max-h-[320px] w-auto max-w-full object-contain"
        skeletonClassName="rounded-[6px]"
      />
    );

    if (!isViewable(img)) {
      return (
        <div className="relative mt-3 flex max-w-full overflow-hidden rounded-[6px]">
          {imageNode}
        </div>
      );
    }

    return (
      <button
        type="button"
        aria-label={`查看图片 ${img.name}`}
        onClick={() => onOpen(getViewerIndex(images, 0))}
        className="relative mt-3 flex max-w-full cursor-zoom-in overflow-hidden rounded-[6px]"
      >
        {imageNode}
      </button>
    );
  }

  const columns = gridColumns(images.length);
  const visible = images.slice(0, MAX_VISIBLE);
  const overflow = images.length - MAX_VISIBLE;

  return (
    <div
      className={cn(
        "mt-3 grid gap-1",
        columns === 2 ? "max-w-[300px] grid-cols-2" : "max-w-[360px] grid-cols-3",
      )}
    >
      {visible.map((img, idx) => {
        const showOverflow = overflow > 0 && idx === visible.length - 1;
        const imageNode = shouldDeferGif(img) ? (
          <DeferredNativeImage
            src={img.access_url}
            alt={img.name}
            className="h-full w-full object-cover"
            skeletonClassName="rounded-[6px]"
          />
        ) : (
          <LoadingImage
            src={img.access_url}
            alt={img.name}
            fill
            fallbackUnoptimized
            sizes="(max-width: 768px) 33vw, 160px"
            className="object-cover"
            skeletonClassName="rounded-[6px]"
          />
        );
        const cellClassName = "relative aspect-square overflow-hidden rounded-[6px] bg-muted";

        if (!isViewable(img)) {
          return (
            <div key={img.id} className={cellClassName}>
              {imageNode}
              {showOverflow && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                  +{overflow}
                </span>
              )}
            </div>
          );
        }

        return (
          <button
            key={img.id}
            type="button"
            aria-label={showOverflow ? "查看更多图片" : `查看图片 ${img.name}`}
            onClick={() => onOpen(getViewerIndex(images, idx))}
            className={cn(cellClassName, "cursor-zoom-in")}
          >
            {imageNode}
            {showOverflow && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                +{overflow}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
