"use client";

import type { MomentItemResp } from "@repo/api";
import { CdnResponsiveImage, cn } from "@repo/ui";
import { DeferredNativeImage } from "@/components/common/loading-image";
import {
  getMomentImageDisplayUrl,
  isVisitorModerationPreviewImage,
  MOMENT_GRID_IMAGE_DISPLAY_WIDTH,
  MOMENT_SINGLE_IMAGE_MAX_WIDTH,
} from "./moment-image-display";
import { MomentImageReviewOverlay } from "./moment-image-review-overlay";
import { MomentSingleImage } from "./moment-single-image";

type MomentImage = NonNullable<MomentItemResp["images"]>[number];

interface MomentImageGridProps {
  images: MomentImage[];
  /** 点击第 index 张（从 0 起）时回调，用于打开全屏画廊 */
  onOpen: (index: number) => void;
  /** 访客待审：叠加审核遮罩 */
  reviewOverlay?: boolean;
  /** 访客审核预览：经 CDN 放大模糊缩略图，布局与公开单图一致 */
  visitorPreviewSizing?: boolean;
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

/** 审核投影图可能缺稳定 id，用 seq + url 兜底避免 React key 冲突 */
function momentImageKey(img: MomentImage, index: number): string {
  if (img.id > 0) {
    return String(img.id);
  }
  return `${img.seq}-${img.url || img.access_url}-${index}`;
}

/** 访客模糊预览走 CDN 放大；公开/作者原图保持 access_url 不变 */
function resolveImageSrc(img: MomentImage, scalePreview: boolean): string {
  return scalePreview ? getMomentImageDisplayUrl(img, true) : img.access_url;
}

const SINGLE_IMAGE_PREVIEW_CLASS = "block h-auto max-h-[320px] w-full object-contain";

/** 外框先占满卡片宽度，避免 inline-block 与百分比宽度循环塌缩 */
const SINGLE_FRAME_PREVIEW_CLASS = `relative mt-3 block w-full max-w-[${MOMENT_SINGLE_IMAGE_MAX_WIDTH}px] overflow-hidden rounded-[6px]`;

const SINGLE_FRAME_PUBLIC_CLASS =
  "relative mt-3 block w-full max-w-full overflow-hidden rounded-[6px]";

function renderSingleImageNode(img: MomentImage, src: string, scalePreview: boolean) {
  if (scalePreview) {
    // 审核预览须为外层 block 容器的直接子 img，w-full 才能铺满遮罩区域
    return (
      <img
        src={src}
        alt={img.name}
        className={SINGLE_IMAGE_PREVIEW_CLASS}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return <MomentSingleImage src={src} alt={img.name} deferGif={shouldDeferGif(img)} />;
}

function renderGridImageNode(img: MomentImage, src: string, scalePreview: boolean) {
  if (scalePreview || shouldDeferGif(img)) {
    return (
      <DeferredNativeImage
        src={src}
        alt={img.name}
        defer={scalePreview ? false : undefined}
        layout="fill"
        className="h-full w-full object-cover"
        skeletonClassName="rounded-[6px]"
      />
    );
  }

  return (
    <CdnResponsiveImage
      src={src}
      alt={img.name}
      preset="comment"
      fill
      imageMode="fixed"
      displayWidth={MOMENT_GRID_IMAGE_DISPLAY_WIDTH}
      className="object-cover"
      skeletonClassName="rounded-[6px]"
    />
  );
}

/**
 * 碎语图片九宫格。
 * - 单图：保留原始宽高比、限制最大高度，不裁剪。
 * - 多图：等大正方形格子 + object-cover 裁剪，低宽度下也不会变形。
 */
export function MomentImageGrid({
  images,
  onOpen,
  reviewOverlay = false,
  visitorPreviewSizing = false,
}: MomentImageGridProps) {
  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    const img = images[0]!;
    const scalePreview = visitorPreviewSizing && isVisitorModerationPreviewImage(img);
    const src = resolveImageSrc(img, scalePreview);
    const frameClass = scalePreview ? SINGLE_FRAME_PREVIEW_CLASS : SINGLE_FRAME_PUBLIC_CLASS;
    const imageNode = renderSingleImageNode(img, src, scalePreview);

    if (!isViewable(img)) {
      return (
        <div className={frameClass} aria-label={reviewOverlay ? "图片审核中" : undefined}>
          {imageNode}
          {reviewOverlay ? <MomentImageReviewOverlay /> : null}
        </div>
      );
    }

    return (
      <button
        type="button"
        aria-label={`查看图片 ${img.name}`}
        onClick={() => onOpen(getViewerIndex(images, 0))}
        className={cn(frameClass, "cursor-zoom-in")}
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
        const scalePreview = visitorPreviewSizing && isVisitorModerationPreviewImage(img);
        const src = resolveImageSrc(img, scalePreview);
        const imageNode = renderGridImageNode(img, src, scalePreview);
        const cellClassName = "relative aspect-square overflow-hidden rounded-[6px] bg-muted";

        if (!isViewable(img)) {
          return (
            <div
              key={momentImageKey(img, idx)}
              className={cellClassName}
              aria-label={reviewOverlay ? "图片审核中" : undefined}
            >
              {imageNode}
              {reviewOverlay ? <MomentImageReviewOverlay compact /> : null}
              {showOverflow && (
                <span className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                  +{overflow}
                </span>
              )}
            </div>
          );
        }

        return (
          <button
            key={momentImageKey(img, idx)}
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
