"use client";

import { DeferredNativeImage, LoadingImage } from "@/components/common/loading-image";
import { useMomentSingleImageDisplaySize } from "@/hooks/use-moment-single-image-display-size";
import {
  MOMENT_SINGLE_IMAGE_MAX_HEIGHT,
  MOMENT_SINGLE_IMAGE_MAX_WIDTH,
} from "./moment-image-display";

interface MomentSingleImageProps {
  src: string;
  alt: string;
  /** 访客模糊预览：立即加载且铺满探测出的展示框 */
  scalePreview?: boolean;
  /** GIF 原图：走 DeferredNativeImage */
  deferGif?: boolean;
}

const SINGLE_IMAGE_OBJECT_CLASS = "object-contain";

/**
 * 碎语单图：先探测原图尺寸并锁定展示框，骨架与最终图共用同一 object-contain 区域。
 */
export function MomentSingleImage({
  src,
  alt,
  scalePreview = false,
  deferGif = false,
}: MomentSingleImageProps) {
  const probedSize = useMomentSingleImageDisplaySize(src);
  const width = probedSize?.width ?? MOMENT_SINGLE_IMAGE_MAX_WIDTH;
  const height = probedSize?.height ?? MOMENT_SINGLE_IMAGE_MAX_HEIGHT;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maxWidth: width,
        aspectRatio: `${width} / ${height}`,
      }}
      data-testid="moment-single-image-frame"
    >
      {scalePreview || deferGif ? (
        <DeferredNativeImage
          src={src}
          alt={alt}
          defer={scalePreview ? false : undefined}
          layout="fill"
          className={SINGLE_IMAGE_OBJECT_CLASS}
          skeletonClassName="rounded-[6px]"
        />
      ) : (
        <LoadingImage
          src={src}
          alt={alt}
          fill
          fallbackUnoptimized
          sizes="(max-width: 768px) 90vw, 480px"
          className={SINGLE_IMAGE_OBJECT_CLASS}
          skeletonClassName="rounded-[6px]"
        />
      )}
    </div>
  );
}
