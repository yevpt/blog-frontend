"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  useDeferredMediaActivation,
  shouldDeferRemoteMediaSrc,
  useImageLoadPlaceholder,
} from "@repo/hooks";
import { stripTransformParams } from "@/lib/blog-image-url";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

function resolveSrcString(src: ImageProps["src"]): string | undefined {
  if (!src) return undefined;
  if (typeof src === "string") return src;
  if (typeof src === "object" && "src" in src) return src.src;
  return undefined;
}

/** CDN 变换图首次加载易失败，失败后间隔重试次数（不含首次） */
const OPTIMIZER_MAX_RETRIES = 3;
const OPTIMIZER_RETRY_DELAY_MS = 1500;

interface LoadingImageProps extends Omit<ImageProps, "className" | "onLoad" | "onError"> {
  className?: string;
  skeletonClassName?: string;
  fallbackClassName?: string;
  /** 变换 URL 多次重试仍失败时回退为无 w/q 的原图直连 */
  fallbackUnoptimized?: boolean;
  /** 首屏仅骨架，页面就绪后再挂载图片（data:/blob: 与 defer=false 立即加载） */
  defer?: boolean;
  onLoad?: ImageProps["onLoad"];
  onError?: ImageProps["onError"];
}

interface DeferredNativeImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  defer?: boolean;
}

/** GIF 等不走 next/image 的场景：同样支持首屏骨架 + 延迟挂载原生 img */
export function DeferredNativeImage({
  src,
  alt,
  className,
  skeletonClassName,
  defer = true,
}: DeferredNativeImageProps) {
  const deferredReady = useDeferredMediaActivation();
  const shouldDefer = defer && shouldDeferRemoteMediaSrc(src);
  const mediaReady = !shouldDefer || deferredReady;

  if (!mediaReady) {
    return (
      <span
        data-testid="deferred-native-image-skeleton"
        aria-hidden="true"
        className={cn("loading-image-skeleton", skeletonClassName, className)}
      />
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}

export function LoadingImage({
  className,
  skeletonClassName,
  fallbackClassName,
  fallbackUnoptimized = false,
  defer = true,
  onLoad,
  onError,
  priority,
  unoptimized: unoptimizedProp,
  src,
  fill,
  ...props
}: LoadingImageProps) {
  const deferredReady = useDeferredMediaActivation();
  const srcString = resolveSrcString(src);
  const shouldDefer = defer && shouldDeferRemoteMediaSrc(srcString);
  const mediaReady = !shouldDefer || deferredReady;

  const [useUnoptimizedFallback, setUseUnoptimizedFallback] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 同一次挂载/重试内避免 onError 与 complete 检测重复触发失败逻辑 */
  const failureHandledRef = useRef(false);
  const isLoading = status === "loading";
  const isError = status === "error";
  const unoptimized = unoptimizedProp || useUnoptimizedFallback;
  const resolvedSrc = resolveSrcString(src);
  const displaySrc =
    useUnoptimizedFallback && resolvedSrc ? stripTransformParams(resolvedSrc) : src;
  const placeholder = useImageLoadPlaceholder(isLoading);

  const scheduleOptimizerRetry = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      failureHandledRef.current = false;
      setRetryAttempt((attempt) => attempt + 1);
    }, OPTIMIZER_RETRY_DELAY_MS);
  }, []);

  const handleImageFailure = useCallback((): boolean => {
    if (failureHandledRef.current) return false;
    failureHandledRef.current = true;

    if (!unoptimized && retryAttempt < OPTIMIZER_MAX_RETRIES) {
      setStatus("loading");
      scheduleOptimizerRetry();
      return false;
    }
    if (fallbackUnoptimized && !unoptimizedProp && !useUnoptimizedFallback) {
      failureHandledRef.current = false;
      setUseUnoptimizedFallback(true);
      setRetryAttempt(0);
      setStatus("loading");
      return false;
    }
    setStatus("error");
    return true;
  }, [
    fallbackUnoptimized,
    retryAttempt,
    scheduleOptimizerRetry,
    unoptimized,
    unoptimizedProp,
    useUnoptimizedFallback,
  ]);

  useEffect(() => {
    failureHandledRef.current = false;
    setRetryAttempt(0);
    setUseUnoptimizedFallback(false);
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      setStatus("loaded");
      return;
    }
    setStatus("loading");
  }, [src]);

  useEffect(() => {
    failureHandledRef.current = false;
  }, [retryAttempt, unoptimized]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  function assignImageRef(node: HTMLImageElement | null) {
    imageRef.current = node;
    if (node?.complete && node.naturalWidth > 0) {
      setStatus("loaded");
      return;
    }
    if (node?.complete && node.naturalWidth === 0) {
      handleImageFailure();
    }
  }

  if (!mediaReady) {
    return (
      <div
        data-testid="loading-image-skeleton"
        aria-hidden="true"
        className={cn(
          fill
            ? "absolute inset-0 z-10 overflow-hidden loading-image-skeleton"
            : "block min-h-[120px] w-full max-w-full overflow-hidden loading-image-skeleton",
          skeletonClassName,
        )}
      />
    );
  }

  const hideImage = placeholder.hideImage || isError;

  return (
    <>
      {placeholder.renderPlaceholder && (
        <div
          data-testid="loading-image-skeleton"
          aria-hidden="true"
          className={cn(
            "absolute inset-0 z-10 overflow-hidden loading-image-skeleton transition-opacity duration-200",
            placeholder.placeholderOpaque ? "opacity-100" : "opacity-0",
            skeletonClassName,
          )}
        />
      )}

      {isError && (
        <div
          data-testid="loading-image-fallback"
          aria-hidden="true"
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-muted text-muted-foreground",
            fallbackClassName,
          )}
        >
          <SvgIcon name="image-off" size={28} />
        </div>
      )}

      <Image
        {...props}
        fill={fill}
        src={displaySrc}
        key={unoptimized ? "unoptimized" : `optimized-${retryAttempt}`}
        ref={assignImageRef}
        priority={priority}
        unoptimized={unoptimized}
        className={cn(
          className,
          placeholder.animateImage && "transition-opacity duration-300",
          hideImage ? "opacity-0" : "opacity-100",
        )}
        fetchPriority={priority ? undefined : "low"}
        onLoad={(event) => {
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          setStatus("loaded");
          onLoad?.(event);
        }}
        onError={(event) => {
          if (handleImageFailure()) {
            onError?.(event);
          }
        }}
      />
    </>
  );
}
