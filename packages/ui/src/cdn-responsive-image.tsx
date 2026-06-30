"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCdnOptimizedImage } from "@repo/hooks/use-cdn-optimized-image";
import {
  shouldDeferRemoteMediaSrc,
  useDeferredMediaActivation,
  useImageLoadPlaceholder,
} from "@repo/hooks";
import type { CdnImagePreset } from "@repo/hooks/cdn-image";
import type { UseCdnOptimizedImageOptions } from "@repo/hooks/use-cdn-optimized-image";
import { cn } from "./lib/utils";

export interface CdnResponsiveImageProps {
  /** 存储/API 返回的原始鉴权 URL */
  src: string;
  alt: string;
  preset: CdnImagePreset;
  className?: string;
  skeletonClassName?: string;
  /** 铺满相对定位父容器 */
  fill?: boolean;
  enabled?: boolean;
  /** 首屏 LCP 图：挂载后 eager + fetchPriority=high */
  priority?: boolean;
  /** 页面就绪前仅骨架、不挂载 img（SSR 不输出图片 URL，避免提前加载） */
  defer?: boolean;
  /** fixed 只输出单一 src，避免 src+srcset 重复请求或误触发 onError */
  imageMode?: UseCdnOptimizedImageOptions["mode"];
  displayWidth?: UseCdnOptimizedImageOptions["displayWidth"];
  onLoad?: () => void;
  /** 图片解码完成且 naturalWidth > 0 时回调 */
  onImageLoad?: (image: HTMLImageElement) => void;
  onError?: () => void;
}

/**
 * 原生 img + CDN 响应式变换：加载中显示骨架，多次重试后回退原图，彻底失败前不展示错误占位。
 */
export function CdnResponsiveImage({
  src,
  alt,
  preset,
  className,
  skeletonClassName,
  fill = false,
  enabled = true,
  priority = false,
  defer = true,
  imageMode,
  displayWidth,
  onLoad,
  onImageLoad,
  onError,
}: CdnResponsiveImageProps) {
  const {
    displaySrc,
    srcSet,
    sizes,
    isLoading,
    isError,
    imgKey,
    onLoad: handleLoad,
    onError: handleError,
  } = useCdnOptimizedImage(src, preset, { enabled, mode: imageMode, displayWidth });

  const deferredReady = useDeferredMediaActivation();
  const shouldDefer = defer && shouldDeferRemoteMediaSrc(src);
  const mediaReady = !shouldDefer || deferredReady;

  const imgRef = useRef<HTMLImageElement | null>(null);
  const markedLoadedRef = useRef(false);
  const onImageLoadRef = useRef(onImageLoad);
  const onLoadRef = useRef(onLoad);
  onImageLoadRef.current = onImageLoad;
  onLoadRef.current = onLoad;

  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    markedLoadedRef.current = false;
  }, [src, imgKey]);

  const markLoaded = useCallback(() => {
    if (markedLoadedRef.current) return;
    markedLoadedRef.current = true;
    setRevealed(true);
    handleLoad();
    const image = imgRef.current;
    if (image && image.naturalWidth > 0) {
      onImageLoadRef.current?.(image);
    }
    onLoadRef.current?.();
  }, [handleLoad]);

  const markLoadedRef = useRef(markLoaded);
  markLoadedRef.current = markLoaded;

  const assignImageRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (!node) return;
    // 不在 naturalWidth=0 时判失败：decoding=async 时字节已到但尚未解码
    if (node.complete && node.naturalWidth > 0) {
      markLoadedRef.current();
    }
  }, []);

  useLayoutEffect(() => {
    const image = imgRef.current;
    if (!image?.complete || image.naturalWidth === 0) return;
    markLoaded();
  }, [displaySrc, imgKey, markLoaded]);

  const showPlaceholder = !priority && isLoading && !isError && !revealed;
  const placeholder = useImageLoadPlaceholder(showPlaceholder);

  const frameClass = fill ? "absolute inset-0 overflow-hidden" : "relative block overflow-hidden";

  const hideImage = !revealed && placeholder.hideImage;

  const deferSkeletonClass = cn(
    "overflow-hidden loading-image-skeleton",
    fill ? "absolute inset-0" : "block min-h-[120px] w-full max-w-full",
    skeletonClassName,
  );

  if (!mediaReady) {
    return (
      <span
        data-testid="cdn-responsive-image-skeleton"
        aria-hidden="true"
        className={deferSkeletonClass}
      />
    );
  }

  return (
    <span className={frameClass}>
      {placeholder.renderPlaceholder ? (
        <span
          data-testid="cdn-responsive-image-skeleton"
          aria-hidden="true"
          className={cn(
            "absolute inset-0 z-10 overflow-hidden loading-image-skeleton transition-opacity duration-200",
            placeholder.placeholderOpaque ? "opacity-100" : "opacity-0",
            skeletonClassName,
          )}
        />
      ) : null}
      <img
        key={imgKey}
        ref={assignImageRef}
        src={displaySrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        onLoad={markLoaded}
        onError={() => {
          if (revealed || (imgRef.current?.naturalWidth ?? 0) > 0) return;
          handleError();
          if (!isLoading) onError?.();
        }}
        className={cn(
          fill ? "absolute inset-0 size-full" : "block max-w-full",
          className,
          placeholder.animateImage && "transition-opacity duration-300",
          // 仅骨架阶段隐藏图片；不强制 opacity-100，避免覆盖调用方传入的透明度
          hideImage && "opacity-0",
        )}
      />
    </span>
  );
}
