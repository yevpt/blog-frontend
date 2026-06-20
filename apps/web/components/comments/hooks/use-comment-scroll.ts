"use client";

/* global HTMLDivElement, ResizeObserver, requestAnimationFrame, window */
import { useCallback, useRef, type RefObject } from "react";

interface UseCommentScrollOptions {
  externalScrollRef?: RefObject<HTMLDivElement | null>;
  onContentResize?: () => void;
}

/** modal 视图专属：滚动容器 ref 合并 + ResizeObserver 高度同步 + 滚动定位 */
export function useCommentScroll({ externalScrollRef, onContentResize }: UseCommentScrollOptions) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onContentResizeRef = useRef(onContentResize);
  onContentResizeRef.current = onContentResize;

  const scrollToListTop = useCallback(() => {
    requestAnimationFrame(() => {
      internalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const scrollToComment = useCallback((commentId: number) => {
    requestAnimationFrame(() => {
      const element = internalScrollRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      internalScrollRef.current = node;
      if (externalScrollRef) {
        externalScrollRef.current = node;
      }
      if (node && typeof window !== "undefined" && "ResizeObserver" in window) {
        const observer = new ResizeObserver(() => {
          onContentResizeRef.current?.();
        });
        observer.observe(node);
        const contentNode = node.firstElementChild;
        if (contentNode) {
          observer.observe(contentNode);
        }
        resizeObserverRef.current = observer;
      }
    },
    [externalScrollRef],
  );

  return { scrollRef, scrollToListTop, scrollToComment };
}
