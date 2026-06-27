"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { useDeferredMediaActivation } from "@/hooks/use-deferred-media-activation";

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
  onLoad?: ImageProps["onLoad"];
  onError?: ImageProps["onError"];
}

export function LoadingImage({
  className,
  skeletonClassName,
  fallbackClassName,
  fallbackUnoptimized = false,
  onLoad,
  onError,
  priority,
  unoptimized: unoptimizedProp,
  src,
  ...props
}: LoadingImageProps) {
  const [useUnoptimizedFallback, setUseUnoptimizedFallback] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoading = status === "loading";
  const isError = status === "error";
  const unoptimized = unoptimizedProp || useUnoptimizedFallback;
  const mediaActivated = useDeferredMediaActivation();

  useEffect(() => {
    setRetryAttempt(0);
    setUseUnoptimizedFallback(false);
    setStatus("loading");
  }, [src]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // 挂载/恢复时同步真实加载状态：next/image 的 onLoad 对「已在浏览器缓存、
  // 挂载前就 complete 的图片」不会再触发（含 bfcache 前进/后退恢复后重挂载的场景），
  // 仅靠 onLoad 会让骨架屏永久卡住。这里读 img.complete 主动补一次状态判定。
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) {
      setStatus(image.naturalWidth > 0 ? "loaded" : "error");
    }
  }, [unoptimized, retryAttempt]);

  function scheduleOptimizerRetry() {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      setRetryAttempt((attempt) => attempt + 1);
    }, OPTIMIZER_RETRY_DELAY_MS);
  }

  return (
    <>
      {isLoading && (
        <div
          data-testid="loading-image-skeleton"
          aria-hidden="true"
          className={cn(
            "absolute inset-0 z-10 overflow-hidden bg-muted loading-image-skeleton",
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

      {mediaActivated && (
        <Image
          {...props}
          src={src}
          key={unoptimized ? "unoptimized" : `optimized-${retryAttempt}`}
          ref={imageRef}
          priority={priority}
          unoptimized={unoptimized}
          className={cn(
            className,
            "transition-opacity duration-300",
            isLoading || isError ? "opacity-0" : "opacity-100",
          )}
          // 非优先图片降低抓取优先级；priority 图片交由 Next.js 设为 "high"
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
      )}
    </>
  );
}
