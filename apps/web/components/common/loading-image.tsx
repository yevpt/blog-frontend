"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

interface LoadingImageProps extends Omit<ImageProps, "className" | "onLoad" | "onError"> {
  className?: string;
  skeletonClassName?: string;
  fallbackClassName?: string;
  onLoad?: ImageProps["onLoad"];
  onError?: ImageProps["onError"];
}

export function LoadingImage({
  className,
  skeletonClassName,
  fallbackClassName,
  onLoad,
  onError,
  ...props
}: LoadingImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isLoading = status === "loading";
  const isError = status === "error";

  // 挂载/恢复时同步真实加载状态：next/image 的 onLoad 对「已在浏览器缓存、
  // 挂载前就 complete 的图片」不会再触发（含 bfcache 前进/后退恢复后重挂载的场景），
  // 仅靠 onLoad 会让骨架屏永久卡住。这里读 img.complete 主动补一次状态判定。
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) {
      setStatus(image.naturalWidth > 0 ? "loaded" : "error");
    }
  }, []);

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
          <SvgIcon name="image" size={28} />
        </div>
      )}

      <Image
        {...props}
        ref={imageRef}
        className={cn(
          className,
          "transition-opacity duration-300",
          isLoading || isError ? "opacity-0" : "opacity-100",
        )}
        fetchPriority="low"
        onLoad={(event) => {
          setStatus("loaded");
          onLoad?.(event);
        }}
        onError={(event) => {
          setStatus("error");
          onError?.(event);
        }}
      />
    </>
  );
}
