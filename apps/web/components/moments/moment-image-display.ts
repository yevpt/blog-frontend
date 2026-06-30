import { buildCdnImageUrl } from "@/lib/blog-image-url";
import type { MomentMediaResp } from "@repo/api";

/** 碎语卡片单图最大展示宽度，与 MomentImageGrid 单图上限一致。 */
export const MOMENT_SINGLE_IMAGE_MAX_WIDTH = 480;

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
