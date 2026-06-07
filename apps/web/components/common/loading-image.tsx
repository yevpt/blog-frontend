"use client";

import { useState } from "react";
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
  const isLoading = status === "loading";
  const isError = status === "error";

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
        className={cn(
          className,
          "transition-opacity duration-300",
          isLoading || isError ? "opacity-0" : "opacity-100",
        )}
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
