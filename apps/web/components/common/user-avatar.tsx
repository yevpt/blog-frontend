"use client";

import { useEffect, useRef, useState } from "react";
import { useDeferredMediaActivation, shouldDeferRemoteMediaSrc } from "@repo/hooks";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import Image from "next/image";

const SIZE = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-[22px] w-[22px] text-[10px]",
  md: "h-7 w-7 text-xs",
  ml: "h-[30px] w-[30px] text-[11px]",
  lg: "h-9 w-9 text-sm",
  xl: "h-12 w-12 text-base",
  "2xl": "h-16 w-16 text-lg",
} as const;

const SIZE_PX: Record<keyof typeof SIZE, number> = {
  xs: 20,
  sm: 22,
  md: 28,
  ml: 30,
  lg: 36,
  xl: 48,
  "2xl": 64,
};

/** VIP 皇冠尺寸与位置，约为头像 1/3，左上角倾斜 */
const VIP_BADGE: Record<keyof typeof SIZE, { position: string; iconSize: number }> = {
  xs: { position: "-left-0.5 -top-1", iconSize: 8 },
  sm: { position: "-left-0.5 -top-1", iconSize: 9 },
  md: { position: "-left-1 -top-1.5", iconSize: 10 },
  ml: { position: "-left-1 -top-1.5", iconSize: 11 },
  lg: { position: "-left-1 -top-2", iconSize: 13 },
  xl: { position: "-left-1.5 -top-2.5", iconSize: 17 },
  "2xl": { position: "-left-2 -top-3", iconSize: 22 },
};

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
  /** 是否在头像左上角显示 VIP 皇冠 */
  isVip?: boolean;
  /** 首屏仅骨架，页面就绪后再加载（data:/blob: 与 defer=false 立即加载） */
  defer?: boolean;
}

function VipBadge({ size }: { size: keyof typeof SIZE }) {
  const { position, iconSize } = VIP_BADGE[size];
  return (
    <SvgIcon
      name="vip"
      size={iconSize}
      aria-hidden
      className={cn("pointer-events-none absolute z-10 -rotate-[35deg]", position)}
    />
  );
}

export function UserAvatar({
  src,
  name,
  size = "md",
  className,
  isVip = false,
  defer = true,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const deferredReady = useDeferredMediaActivation();
  const px = SIZE_PX[size];
  const initial = name[0]?.toUpperCase() ?? "?";
  const base = cn("shrink-0 rounded-full overflow-hidden", SIZE[size], className);
  const placeholderClassName = "flex items-center justify-center bg-border font-bold text-(--fg2)";

  const validSrc = src
    ? src.startsWith("http") || src.startsWith("/") || src.startsWith("data:")
      ? src
      : `/${src}`
    : undefined;

  const shouldDefer = defer && shouldDeferRemoteMediaSrc(validSrc);
  const mediaReady = !shouldDefer || deferredReady;

  useEffect(() => {
    setFailed(false);
    const image = imageRef.current;
    setLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [validSrc]);

  const vipBadge = isVip ? <VipBadge size={size} /> : null;

  if (validSrc && !failed && !mediaReady) {
    return (
      <span className={cn("relative inline-flex", base, "bg-muted")} aria-busy="true">
        <span
          data-testid="user-avatar-skeleton"
          aria-hidden="true"
          className="loading-image-skeleton absolute inset-0 h-full w-full"
        />
        {vipBadge}
      </span>
    );
  }

  if (validSrc && !failed) {
    return (
      <span className={cn("relative inline-flex", base, "bg-border")}>
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
          ref={imageRef}
          src={validSrc}
          alt={name}
          width={px}
          height={px}
          unoptimized
          loading="lazy"
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          suppressHydrationWarning
        />
        {vipBadge}
      </span>
    );
  }

  return (
    <div className={cn("relative inline-flex", base, placeholderClassName)}>
      {initial}
      {vipBadge}
    </div>
  );
}
