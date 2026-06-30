import { buildCdnImageUrl } from "@/lib/blog-image-url";
import type { MomentMediaResp } from "@repo/api";

/** 碎语卡片单图最大展示宽度，与 MomentImageGrid 单图上限一致。 */
export const MOMENT_SINGLE_IMAGE_MAX_WIDTH = 480;
/** 碎语卡片单图最大展示高度，与 MomentImageGrid 单图 class 一致。 */
export const MOMENT_SINGLE_IMAGE_MAX_HEIGHT = 320;

export interface MomentSingleImageDisplaySize {
  width: number;
  height: number;
}

/** 按 object-contain 规则计算单图在卡片内的实际展示尺寸（不放大原图）。 */
export function computeMomentSingleImageDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth = MOMENT_SINGLE_IMAGE_MAX_WIDTH,
  maxHeight = MOMENT_SINGLE_IMAGE_MAX_HEIGHT,
): MomentSingleImageDisplaySize {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  };
}

type MomentImageSource = Pick<MomentMediaResp, "access_url" | "display_mode">;

/** 访客侧展示的非原图投影（模糊预览 / GIF 占位）。 */
export function isVisitorModerationPreviewImage(image: MomentImageSource): boolean {
  return image.display_mode === "blurred" || image.display_mode === "gif_placeholder";
}

/**
 * 访客待审模糊预览后端最长边仅 48px；经 CDN 放大到卡片宽度后，
 * 与作者原图使用相同的 object-contain / 九宫格布局，避免缩成一个小点。
 */
export function getMomentImageDisplayUrl(image: MomentImageSource, scalePreview: boolean): string {
  if (!scalePreview || image.display_mode === "original") {
    return image.access_url;
  }
  return buildCdnImageUrl(image.access_url, MOMENT_SINGLE_IMAGE_MAX_WIDTH);
}
