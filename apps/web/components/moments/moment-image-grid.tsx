"use client";

import type { MomentItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import { LoadingImage } from "@/components/common/loading-image";

type MomentImage = NonNullable<MomentItemResp["images"]>[number];

interface MomentImageGridProps {
  images: MomentImage[];
  /** 点击第 index 张（从 0 起）时回调，用于打开全屏画廊 */
  onOpen: (index: number) => void;
  /** 首屏可见时设为 true，使首图 eager 加载，避免 LCP 警告 */
  priority?: boolean;
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

/**
 * 碎语图片九宫格。
 * - 单图：保留原始宽高比、限制最大高度，不裁剪。
 * - 多图：等大正方形格子 + object-cover 裁剪，低宽度下也不会变形。
 */
export function MomentImageGrid({ images, onOpen, priority = false }: MomentImageGridProps) {
  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    const img = images[0]!;
    return (
      <button
        type="button"
        aria-label={`查看图片 ${img.name}`}
        onClick={() => onOpen(0)}
        className="relative mt-2.5 flex max-w-full cursor-zoom-in overflow-hidden rounded-[6px]"
      >
        {/* width/height 设 0 + sizes：next/image 的「未知尺寸」用法，按原始比例自适应 */}
        {isGifImage(img) ? (
          <img
            src={img.access_url}
            alt={img.name}
            className="block h-auto max-h-[320px] w-auto max-w-full object-contain"
          />
        ) : (
          <LoadingImage
            src={img.access_url}
            alt={img.name}
            width={0}
            height={0}
            priority={priority}
            fallbackUnoptimized
            sizes="(max-width: 768px) 90vw, 480px"
            className="block h-auto max-h-[320px] w-auto max-w-full object-contain"
            skeletonClassName="rounded-[6px]"
          />
        )}
      </button>
    );
  }

  const columns = gridColumns(images.length);
  const visible = images.slice(0, MAX_VISIBLE);
  const overflow = images.length - MAX_VISIBLE;

  return (
    <div
      className={cn(
        "mt-2.5 grid gap-1",
        columns === 2 ? "max-w-[300px] grid-cols-2" : "max-w-[360px] grid-cols-3",
      )}
    >
      {visible.map((img, idx) => {
        const showOverflow = overflow > 0 && idx === visible.length - 1;
        return (
          <button
            key={img.id}
            type="button"
            aria-label={showOverflow ? "查看更多图片" : `查看图片 ${img.name}`}
            onClick={() => onOpen(idx)}
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-[6px] bg-muted"
          >
            {isGifImage(img) ? (
              <img src={img.access_url} alt={img.name} className="h-full w-full object-cover" />
            ) : (
              <LoadingImage
                src={img.access_url}
                alt={img.name}
                fill
                priority={priority && idx === 0}
                fallbackUnoptimized
                sizes="(max-width: 768px) 33vw, 160px"
                className="object-cover"
                skeletonClassName="rounded-[6px]"
              />
            )}
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
