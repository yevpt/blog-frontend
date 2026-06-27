"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDeferredMediaActivation, shouldDeferRemoteMediaSrc } from "@repo/hooks";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import Image from "next/image";
import {
  isLocalFallbackAvatarUrl,
  resolveFallbackAvatarUrl,
  resolveInitialsTone,
} from "@/lib/preset-avatar";

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
  /** 用于固定映射自托管 mock 头像；无头像或加载失败时展示 */
  userId?: string | number;
  size?: keyof typeof SIZE;
  className?: string;
  /** 是否在头像左上角显示 VIP 皇冠 */
  isVip?: boolean;
  /** 首屏仅骨架，页面就绪后再加载（data:/blob: 与 defer=false 立即加载） */
  defer?: boolean;
  /** 首屏 LCP 头像设 true 启用 priority + eager（跳过骨架延迟与 lazy） */
  priority?: boolean;
  /** 虚拟滚动等场景设为 true，跳过浏览器的 lazy 视口阈值，立即加载 */
  loadingEager?: boolean;
}

/** Next.js 优化器不处理的后缀（服务端脚本，非图像），后端存图时保留了源站文件名 */
const BLOCKED_EXTENSIONS = new Set(["php", "asp", "aspx", "jsp", "cgi", "pl"]);

/** 过滤 .php/.asp 等不渲染 img（Next.js 优化器会 400），无后缀放行 */
function isAvatarImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
    return ext ? !BLOCKED_EXTENSIONS.has(ext) : true;
  } catch {
    return false;
  }
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

function normalizeAvatarSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  const normalized = src.startsWith("http") || src.startsWith("/") ? src : `/${src}`;
  return isAvatarImageUrl(normalized) ? normalized : undefined;
}

function resolveAvatarSeed(userId: string | number | undefined): string | number | undefined {
  if (userId != null && userId !== "") return userId;
  return undefined;
}

export function UserAvatar({
  src,
  name,
  userId,
  size = "md",
  className,
  isVip = false,
  defer = true,
  priority = false,
  loadingEager = false,
}: UserAvatarProps) {
  const [userImageFailed, setUserImageFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const deferredReady = useDeferredMediaActivation();
  const px = SIZE_PX[size];
  const initial = name[0]?.toUpperCase() ?? "?";
  const base = cn("shrink-0 rounded-full overflow-hidden", SIZE[size], className);
  const initialsSeed = resolveAvatarSeed(userId) ?? name;
  const initialsTone = resolveInitialsTone(initialsSeed);

  const userSrc = normalizeAvatarSrc(src);
  const fallbackSrc = (() => {
    const seed = resolveAvatarSeed(userId);
    return seed != null ? resolveFallbackAvatarUrl(seed) : undefined;
  })();
  const usingUserAvatar = Boolean(userSrc && !userImageFailed);
  const validSrc = usingUserAvatar ? userSrc : fallbackSrc;
  const showInitialsOnly = !usingUserAvatar && !fallbackSrc;

  const shouldDefer =
    defer &&
    !priority &&
    shouldDeferRemoteMediaSrc(validSrc) &&
    !isLocalFallbackAvatarUrl(validSrc);
  const mediaReady = !shouldDefer || deferredReady;

  const isFirstSrcEffect = useRef(true);
  useEffect(() => {
    if (isFirstSrcEffect.current) {
      isFirstSrcEffect.current = false;
      return;
    }
    setUserImageFailed(false);
    setLoaded(false);
  }, [src]);

  // callback ref 在 DOM commit 阶段同步触发（早于 paint），
  // 对重挂的缓存图片直接标记 loaded → 零帧闪烁
  const handleImageRef = useCallback((node: HTMLImageElement | null) => {
    imageRef.current = node;
    if (!node) return;
    if (node.complete && node.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, []);

  const vipBadge = isVip ? <VipBadge size={size} /> : null;

  // 稳定 DOM 结构：skeleton / placeholder / image 三层始终同在一个容器，
  // 仅通过 opacity 切换，避免 DOM 替换触发浏览器网格 layout 重算 → CLS
  const showImage = Boolean(validSrc);
  const skeletonVisible = showImage && !mediaReady;
  const placeholderVisible = !showImage || !loaded;
  const imageVisible = showImage && mediaReady && loaded;

  return (
    <span
      className={cn("relative inline-flex", base, showInitialsOnly ? initialsTone : "bg-border")}
      aria-busy={skeletonVisible ? "true" : undefined}
    >
      {/* 骨架层：页面就绪前可见，就绪后透明 */}
      {showImage && (
        <span
          data-testid="user-avatar-skeleton"
          aria-hidden="true"
          className={cn(
            "loading-image-skeleton absolute inset-0 h-full w-full transition-opacity duration-200",
            skeletonVisible ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        />
      )}

      {/* 占位层：始终存在，图片加载完成后透明 */}
      <span
        data-testid="user-avatar-placeholder"
        aria-hidden="true"
        className={cn(
          "flex h-full w-full items-center justify-center font-bold",
          showInitialsOnly ? initialsTone : "bg-border text-(--fg2)",
          "transition-opacity duration-200",
          placeholderVisible ? "opacity-100" : "opacity-0",
        )}
      >
        {initial}
      </span>

      {/* 图片层：页面就绪后挂载，加载完成后淡入 */}
      {validSrc && showImage && mediaReady && (
        <Image
          key={validSrc}
          ref={handleImageRef}
          src={validSrc}
          alt={name}
          width={px}
          height={px}
          unoptimized
          priority={priority}
          loading={priority || loadingEager ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            imageVisible ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setUserImageFailed(true)}
          suppressHydrationWarning
        />
      )}

      {vipBadge}
    </span>
  );
}
