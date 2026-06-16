"use client";

import { useEffect, useState } from "react";
import { cn } from "@repo/ui";
import Image from "next/image";

const SIZE = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-[22px] w-[22px] text-[10px]",
  md: "h-7 w-7 text-xs",
  lg: "h-9 w-9 text-sm",
  xl: "h-12 w-12 text-base",
  "2xl": "h-16 w-16 text-lg",
} as const;

const SIZE_PX: Record<keyof typeof SIZE, number> = {
  xs: 20,
  sm: 22,
  md: 28,
  lg: 36,
  xl: 48,
  "2xl": 64,
};

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}

export function UserAvatar({ src, name, size = "md", className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const px = SIZE_PX[size];
  const initial = name[0]?.toUpperCase() ?? "?";
  const base = cn("shrink-0 rounded-full overflow-hidden", SIZE[size], className);
  const placeholderClassName = "flex items-center justify-center bg-border font-bold text-(--fg2)";

  const validSrc = src
    ? src.startsWith("http") || src.startsWith("/") || src.startsWith("data:")
      ? src
      : `/${src}`
    : undefined;

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [validSrc]);

  if (validSrc && !failed) {
    return (
      <span className={cn(base, "relative inline-flex bg-border")}>
        <span
          data-testid="user-avatar-placeholder"
          aria-hidden="true"
          className={cn(
            "h-full w-full",
            placeholderClassName,
            "transition-opacity duration-200",
            loaded ? "opacity-0" : "opacity-100",
          )}
        >
          {initial}
        </span>
        <Image
          src={validSrc}
          alt={name}
          width={px}
          height={px}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          suppressHydrationWarning
        />
      </span>
    );
  }

  return <div className={cn(base, placeholderClassName)}>{initial}</div>;
}
