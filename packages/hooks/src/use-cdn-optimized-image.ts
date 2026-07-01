"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CDN_IMAGE_MAX_RETRIES,
  CDN_IMAGE_RETRY_DELAY_MS,
  resolveCdnImageAttrs,
  stripTransformParams,
  type CdnImageDisplayAttrs,
  type CdnImagePreset,
} from "./cdn-image";

export type CdnOptimizedImageStatus = "loading" | "loaded" | "error";

export interface UseCdnOptimizedImageOptions {
  /** 为 false 时始终使用原图 URL */
  enabled?: boolean;
  /** 默认 responsive；fixed 只输出单一 src */
  mode?: "responsive" | "fixed";
  /** mode=fixed 时的目标展示宽度 */
  displayWidth?: number;
  /** CDN 重试耗尽后是否回退原图；编辑器预览应设为 false，避免额外拉整图 */
  fallbackToOriginal?: boolean;
}

export interface UseCdnOptimizedImageResult {
  displaySrc: string;
  srcSet?: string;
  sizes?: string;
  status: CdnOptimizedImageStatus;
  isLoading: boolean;
  /** 多次重试且原图回退仍失败后为 true */
  isError: boolean;
  /** 强制 remount img 以触发重试 */
  imgKey: string;
  onLoad: () => void;
  onError: () => void;
}

export function useCdnOptimizedImage(
  originalSrc: string,
  preset: CdnImagePreset,
  options?: UseCdnOptimizedImageOptions,
): UseCdnOptimizedImageResult {
  const active = (options?.enabled ?? true) && preset !== "off";
  const fallbackToOriginal = options?.fallbackToOriginal ?? true;
  const attrs = useMemo((): CdnImageDisplayAttrs | null => {
    if (!originalSrc || preset === "off") return null;
    return resolveCdnImageAttrs(originalSrc, preset, {
      mode: options?.mode,
      displayWidth: options?.displayWidth,
    });
  }, [originalSrc, preset, options?.mode, options?.displayWidth]);

  const [useFallback, setUseFallback] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [status, setStatus] = useState<CdnOptimizedImageStatus>("loading");
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureHandledRef = useRef(false);
  const loadedRef = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  const optimizable = Boolean(attrs?.optimizable) && active && !useFallback;

  const displaySrc = useMemo(() => {
    if (!originalSrc) return "";
    // 可优化图首帧也只用 CDN URL，避免 img 先挂原图 src 触发整页预取
    if (attrs?.optimizable && !useFallback) return attrs.src;
    return originalSrc;
  }, [attrs, originalSrc, useFallback]);

  const srcSet = optimizable ? attrs?.srcSet : undefined;
  const sizes = optimizable ? attrs?.sizes : undefined;

  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      failureHandledRef.current = false;
      setRetryAttempt((attempt) => attempt + 1);
    }, CDN_IMAGE_RETRY_DELAY_MS);
  }, []);

  useEffect(() => {
    failureHandledRef.current = false;
    loadedRef.current = false;
    setUseFallback(false);
    setRetryAttempt(0);
    setStatus(originalSrc ? "loading" : "loaded");
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [originalSrc, preset, active]);

  useEffect(() => {
    failureHandledRef.current = false;
  }, [retryAttempt, useFallback]);

  const onLoad = useCallback(() => {
    loadedRef.current = true;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setStatus("loaded");
  }, []);

  const onError = useCallback(() => {
    if (failureHandledRef.current || loadedRef.current || statusRef.current === "loaded") return;
    failureHandledRef.current = true;

    if (optimizable && retryAttempt < CDN_IMAGE_MAX_RETRIES) {
      setStatus("loading");
      scheduleRetry();
      return;
    }

    if (optimizable && !useFallback && fallbackToOriginal) {
      failureHandledRef.current = false;
      setUseFallback(true);
      setRetryAttempt(0);
      setStatus("loading");
      return;
    }

    setStatus("error");
  }, [fallbackToOriginal, optimizable, retryAttempt, scheduleRetry, useFallback]);

  const fallbackSrc = originalSrc ? stripTransformParams(originalSrc) : originalSrc;
  const resolvedDisplaySrc = useFallback ? fallbackSrc : displaySrc;

  return {
    displaySrc: resolvedDisplaySrc,
    srcSet,
    sizes,
    status,
    isLoading: status === "loading",
    isError: status === "error",
    imgKey: `${useFallback ? "fallback" : "optimized"}-${retryAttempt}`,
    onLoad,
    onError,
  };
}
