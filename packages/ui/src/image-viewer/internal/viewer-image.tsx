"use client";

import { useEffect, useRef, useState } from "react";
import { useImageLoadPlaceholder } from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import { cn } from "../../lib/utils";
import type { ViewerTransform } from "../types";

interface ViewerImageProps {
  src: string;
  alt: string;
  transform: ViewerTransform;
  isGesturing: boolean;
}

/** 预览大图：加载中骨架、失败占位、加载完成淡入。 */
export function ViewerImage({ src, alt, transform, isGesturing }: ViewerImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setStatus("loading");
  }, [src]);

  const isLoading = status === "loading";
  const isError = status === "error";
  const placeholder = useImageLoadPlaceholder(isLoading);

  function assignImageRef(node: HTMLImageElement | null) {
    imageRef.current = node;
    if (node?.complete) {
      setStatus(node.naturalWidth > 0 ? "loaded" : "error");
    }
  }

  const hideImage = placeholder.hideImage || isError;

  return (
    <>
      {placeholder.renderPlaceholder ? (
        <div
          data-testid="image-viewer-skeleton"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2",
            "h-[min(56vh,400px)] w-[min(88vw,600px)] rounded-xl loading-image-skeleton transition-opacity duration-200",
            placeholder.placeholderOpaque ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      {isError ? (
        <div
          data-testid="image-viewer-fallback"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2",
            "h-[min(56vh,400px)] w-[min(88vw,600px)] items-center justify-center rounded-xl bg-muted text-muted-foreground",
          )}
        >
          <SvgIcon name="image-off" size={40} />
        </div>
      ) : null}

      <img
        ref={assignImageRef}
        src={src}
        alt={alt}
        draggable={false}
        className={cn(
          "max-h-full max-w-full touch-none select-none object-contain",
          placeholder.animateImage && "transition-opacity duration-300",
          !isGesturing && "transition-transform duration-150 ease-out",
          hideImage ? "opacity-0" : "opacity-100",
        )}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
          cursor: transform.scale > 1 ? "grab" : "default",
        }}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </>
  );
}
