"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useDeferredMediaActivation, shouldDeferRemoteMediaSrc } from "@repo/hooks";
import { cn } from "@repo/ui";
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

interface UserAvatarProps {
  src?: string;
  name: string;
  /** 用于固定映射自托管 mock 头像；无头像或加载失败时展示 */
  userId?: string | number;
  size?: keyof typeof SIZE;
  className?: string;
  /** 首屏仅骨架，页面就绪后再加载（data:/blob: 与 defer=false 立即加载） */
  defer?: boolean;
  /** 首屏 LCP 头像设 true，跳过 defer 且 loading=eager */
  priority?: boolean;
  /** 常驻头像设 true：img 使用 loading=eager（不跳过 defer 骨架） */
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

/** 进程内已成功加载过的头像 URL；remount 时避免骨架/占位重播（与 globalMediaActivated 同类策略） */
const loadedAvatarSrcCache = new Set<string>();

/** 仅供测试隔离 */
export function resetLoadedAvatarSrcCacheForTests(): void {
  loadedAvatarSrcCache.clear();
}

function markAvatarSrcLoaded(src: string | undefined): void {
  if (src) loadedAvatarSrcCache.add(src);
}

function isAvatarSrcLoaded(src: string | undefined): boolean {
  return Boolean(src && loadedAvatarSrcCache.has(src));
}

/** 远程头像加载超时（毫秒） */
export const AVATAR_LOAD_TIMEOUT_MS = 8_000;
/** 超时/失败后重试次数（不含首次加载） */
export const AVATAR_MAX_RETRIES = 3;
/** 重试间隔（毫秒） */
export const AVATAR_RETRY_DELAY_MS = 1_500;

function shouldWatchAvatarLoad(src: string | undefined): boolean {
  if (!src) return false;
  return shouldDeferRemoteMediaSrc(src);
}

function UserAvatarInner({
  src,
  name,
  userId,
  size = "md",
  className,
  defer = true,
  priority = false,
  loadingEager = false,
}: UserAvatarProps) {
  const [userImageFailed, setUserImageFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageLatchRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureHandledRef = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const deferredReady = useDeferredMediaActivation();
  const px = SIZE_PX[size];
  const initial = name[0]?.toUpperCase() ?? "?";
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

  const outerClass = cn("relative inline-flex shrink-0 rounded-full", SIZE[size], className);
  const innerClass = cn(
    "relative h-full w-full overflow-hidden rounded-full",
    showInitialsOnly ? initialsTone : "bg-border",
  );

  const shouldDefer =
    defer &&
    !priority &&
    shouldDeferRemoteMediaSrc(validSrc) &&
    !isLocalFallbackAvatarUrl(validSrc);
  const mediaReady = isClient && (!shouldDefer || deferredReady);

  const reuseLoadedSrc = Boolean(validSrc && isAvatarSrcLoaded(validSrc));
  const imageLoading = priority || loadingEager || reuseLoadedSrc ? "eager" : "lazy";

  const showImage = Boolean(validSrc);
  if (showImage && mediaReady) {
    imageLatchRef.current = true;
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

  const clearAvatarTimers = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const scheduleAvatarRetry = useCallback(() => {
    clearAvatarTimers();
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      failureHandledRef.current = false;
      setLoaded(false);
      setRetryAttempt((attempt) => attempt + 1);
    }, AVATAR_RETRY_DELAY_MS);
  }, [clearAvatarTimers]);

  const handleAvatarLoadFailure = useCallback(() => {
    if (failureHandledRef.current) return;
    failureHandledRef.current = true;
    clearAvatarTimers();

    if (retryAttempt < AVATAR_MAX_RETRIES) {
      scheduleAvatarRetry();
      return;
    }

    if (userSrc && validSrc === userSrc) {
      setUserImageFailed(true);
    }
    setLoaded(false);
  }, [clearAvatarTimers, retryAttempt, scheduleAvatarRetry, userSrc, validSrc]);

  const isFirstSrcEffect = useRef(true);
  const prevValidSrcRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isFirstSrcEffect.current) {
      isFirstSrcEffect.current = false;
      return;
    }
    failureHandledRef.current = false;
    setUserImageFailed(false);
    setLoaded(false);
    setRetryAttempt(0);
    prevValidSrcRef.current = undefined;
    clearAvatarTimers();
  }, [src, clearAvatarTimers]);

  useEffect(() => {
    if (prevValidSrcRef.current === validSrc) {
      if (!validSrc) {
        setLoaded(false);
        return;
      }
      if (isAvatarSrcLoaded(validSrc)) {
        setLoaded(true);
      }
      return;
    }

    prevValidSrcRef.current = validSrc;
    failureHandledRef.current = false;
    setRetryAttempt(0);
    clearAvatarTimers();
    if (!validSrc) {
      setLoaded(false);
      return;
    }
    if (isAvatarSrcLoaded(validSrc)) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [validSrc, clearAvatarTimers]);

  useEffect(() => {
    failureHandledRef.current = false;
  }, [retryAttempt]);

  useEffect(() => {
    if (!validSrc || !imageLatchRef.current || loaded) return;
    if (!shouldWatchAvatarLoad(validSrc)) return;
    if (isAvatarSrcLoaded(validSrc)) return;

    loadTimeoutRef.current = setTimeout(() => {
      loadTimeoutRef.current = null;
      handleAvatarLoadFailure();
    }, AVATAR_LOAD_TIMEOUT_MS);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [validSrc, retryAttempt, loaded, mediaReady, handleAvatarLoadFailure]);

  useEffect(() => () => clearAvatarTimers(), [clearAvatarTimers]);

  const handleImageRef = useCallback(
    (node: HTMLImageElement | null) => {
      imageRef.current = node;
      if (!node || !validSrc) return;

      if (node.complete && node.naturalWidth > 0) {
        markAvatarSrcLoaded(validSrc);
        setLoaded(true);
        return;
      }

      if (isAvatarSrcLoaded(validSrc)) {
        return;
      }

      setLoaded(false);
    },
    [validSrc],
  );

  const skeletonVisible = showImage && !mediaReady;
  const placeholderVisible = !showImage || !loaded;
  const imageVisible = showImage && mediaReady && loaded;

  return (
    <span className={outerClass} aria-busy={skeletonVisible ? "true" : undefined}>
      <span className={innerClass}>
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

        {/* 头像极小且直连 OSS；latch 保证 defer 结束后不因父级重渲染卸载 img */}
        {validSrc && showImage && imageLatchRef.current && (
          <img
            key={`${validSrc}-${retryAttempt}`}
            ref={handleImageRef}
            src={validSrc}
            alt={name}
            width={px}
            height={px}
            loading={imageLoading}
            decoding="async"
            data-retry-attempt={retryAttempt}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              imageVisible ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => {
              clearAvatarTimers();
              failureHandledRef.current = false;
              markAvatarSrcLoaded(validSrc);
              setLoaded(true);
            }}
            onError={() => handleAvatarLoadFailure()}
          />
        )}
      </span>
    </span>
  );
}

function areUserAvatarPropsEqual(prev: UserAvatarProps, next: UserAvatarProps): boolean {
  return (
    prev.src === next.src &&
    prev.userId === next.userId &&
    prev.name === next.name &&
    prev.size === next.size &&
    prev.className === next.className &&
    prev.defer === next.defer &&
    prev.priority === next.priority &&
    prev.loadingEager === next.loadingEager
  );
}

export const UserAvatar = memo(UserAvatarInner, areUserAvatarPropsEqual);
