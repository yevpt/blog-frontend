import { useEffect, useState } from "react";

/** 加载很快时不闪占位：超过该时间仍未完成才显示骨架。 */
export const IMAGE_PLACEHOLDER_DELAY_MS = 200;
/** 占位淡出时长，与图片淡入叠化。 */
export const IMAGE_PLACEHOLDER_FADE_MS = 200;

export interface ImageLoadPlaceholderState {
  /** 是否渲染占位节点（含淡出阶段） */
  renderPlaceholder: boolean;
  /** 占位是否完全不透明 */
  placeholderOpaque: boolean;
  /** 图片是否应隐藏（仅在占位完全显示且仍在加载时） */
  hideImage: boolean;
  /** 图片是否使用 opacity 过渡（快速加载时跳过，避免闪一下） */
  animateImage: boolean;
}

/**
 * 图片加载占位策略：慢网显示骨架，快网/缓存直出图片，避免白闪。
 */
export function useImageLoadPlaceholder(isPending: boolean): ImageLoadPlaceholderState {
  const [placeholderOpaque, setPlaceholderOpaque] = useState(false);
  const [renderPlaceholder, setRenderPlaceholder] = useState(false);
  const [animateImage, setAnimateImage] = useState(false);

  useEffect(() => {
    if (isPending) {
      setAnimateImage(false);
      setPlaceholderOpaque(false);
      setRenderPlaceholder(false);

      const delayId = window.setTimeout(() => {
        setRenderPlaceholder(true);
        setPlaceholderOpaque(true);
        setAnimateImage(true);
      }, IMAGE_PLACEHOLDER_DELAY_MS);

      return () => window.clearTimeout(delayId);
    }

    setPlaceholderOpaque(false);

    let fadeId: number | undefined;
    setRenderPlaceholder((mounted) => {
      if (!mounted) return false;
      fadeId = window.setTimeout(() => setRenderPlaceholder(false), IMAGE_PLACEHOLDER_FADE_MS);
      return true;
    });

    return () => {
      if (fadeId !== undefined) window.clearTimeout(fadeId);
    };
  }, [isPending]);

  return {
    renderPlaceholder,
    placeholderOpaque,
    hideImage: isPending && placeholderOpaque,
    animateImage,
  };
}
