"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  useDeferredMediaActivation,
  shouldDeferRemoteMediaSrc,
  useImageLoadPlaceholder,
} from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

function resolveSrcString(src: ImageProps["src"]): string | undefined {
  if (!src) return undefined;
  if (typeof src === "string") return src;
  if (typeof src === "object" && "src" in src) return src.src;
  return undefined;
}

/** /_next/image 首次拉 OSS 易超时，失败后间隔重试次数（不含首次） */
const OPTIMIZER_MAX_RETRIES = 3;
/** 重试间隔：给 OSS / 优化器留出恢复时间 */
const OPTIMIZER_RETRY_DELAY_MS = 1500;

interface LoadingImageProps extends Omit<ImageProps, "className" | "onLoad" | "onError"> {
  className?: string;
  skeletonClassName?: string;
  fallbackClassName?: string;
  /** 优化器多次重试仍失败时回退为 unoptimized 直连原图 */
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
  const isLoading = status === "loading";
  const isError = status === "error";
  const unoptimized = unoptimizedProp || useUnoptimizedFallback;
  const placeholder = useImageLoadPlaceholder(isLoading);

  useEffect(() => {
    setRetryAttempt(0);
    setUseUnoptimizedFallback(false);
    const image = imageRef.current;
    if (image?.complete) {
      setStatus(image.naturalWidth > 0 ? "loaded" : "error");
      return;
    }
    setStatus("loading");
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) {
      setStatus(image.naturalWidth > 0 ? "loaded" : "error");
    }
  }, [unoptimized, retryAttempt]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  function assignImageRef(node: HTMLImageElement | null) {
    imageRef.current = node;
    if (node?.complete) {
      setStatus(node.naturalWidth > 0 ? "loaded" : "error");
    }
  }

  function scheduleOptimizerRetry() {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      setRetryAttempt((attempt) => attempt + 1);
    }, OPTIMIZER_RETRY_DELAY_MS);
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
        src={src}
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
          if (!unoptimized && retryAttempt < OPTIMIZER_MAX_RETRIES) {
            scheduleOptimizerRetry();
            return;
          }
          if (fallbackUnoptimized && !unoptimized) {
            setUseUnoptimizedFallback(true);
            setRetryAttempt(0);
            setStatus("loading");
            return;
          }
          setStatus("error");
          onError?.(event);
        }}
      />
    </>
  );
}
