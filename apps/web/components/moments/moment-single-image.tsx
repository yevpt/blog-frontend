"use client";

import { useCallback, useState } from "react";
import { CdnResponsiveImage } from "@repo/ui";
import { DeferredNativeImage } from "@/components/common/loading-image";
import {
  computeMomentSingleImageDisplaySize,
  MOMENT_SINGLE_IMAGE_MAX_HEIGHT,
  MOMENT_SINGLE_IMAGE_MAX_WIDTH,
  type MomentSingleImageDisplaySize,
} from "./moment-image-display";

interface MomentSingleImageProps {
  src: string;
  alt: string;
  /** GIF 原图：走 DeferredNativeImage */
  deferGif?: boolean;
}

const SINGLE_IMAGE_OBJECT_CLASS = "object-contain";

/**
 * 碎语公开单图：展示图 onLoad 后锁定 object-contain 框；审核模糊预览在 MomentImageGrid 内单独渲染。
 */
export function MomentSingleImage({ src, alt, deferGif = false }: MomentSingleImageProps) {
  const [loadedSize, setLoadedSize] = useState<MomentSingleImageDisplaySize | null>(null);

  const applyNaturalSize = useCallback((naturalWidth: number, naturalHeight: number) => {
    setLoadedSize(computeMomentSingleImageDisplaySize(naturalWidth, naturalHeight));
  }, []);

  const width = loadedSize?.width ?? MOMENT_SINGLE_IMAGE_MAX_WIDTH;
  const height = loadedSize?.height ?? MOMENT_SINGLE_IMAGE_MAX_HEIGHT;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maxWidth: width,
        aspectRatio: `${width} / ${height}`,
      }}
      data-testid="moment-single-image-frame"
    >
      {deferGif ? (
        <DeferredNativeImage
          src={src}
          alt={alt}
          layout="fill"
          className={SINGLE_IMAGE_OBJECT_CLASS}
          skeletonClassName="rounded-[6px]"
        />
      ) : (
        <CdnResponsiveImage
          src={src}
          alt={alt}
          preset="comment"
          fill
          imageMode="fixed"
          displayWidth={MOMENT_SINGLE_IMAGE_MAX_WIDTH}
          className={SINGLE_IMAGE_OBJECT_CLASS}
          skeletonClassName="rounded-[6px]"
          onImageLoad={(image) => applyNaturalSize(image.naturalWidth, image.naturalHeight)}
        />
      )}
    </div>
  );
}
