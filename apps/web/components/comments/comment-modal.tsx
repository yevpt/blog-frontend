"use client";

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import type { CSSProperties, RefObject } from "react";
import { SvgIcon } from "@repo/icons";
import { Modal, cn } from "@repo/ui";
import { useSheetGesture } from "@/hooks/use-sheet-gesture";
import { CommentSection } from "./comment-section";

type TargetType = "article" | "moment";

interface CommentModalProps {
  targetType: TargetType;
  targetId: number;
  onClose: () => void;
  onCommentAdded?: () => void;
}

function useAnimatedClose(onClose: () => void) {
  const [isOpen, setIsOpen] = useState(true);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    },
    [],
  );

  function requestClose() {
    setIsOpen(false);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(onClose, 210);
  }

  return { isOpen, requestClose };
}

const DESKTOP_HEIGHT_SPRING = "0.35s cubic-bezier(0.2, 0.9, 0.24, 1)";

function getDesktopModalMaxHeight() {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  return viewportHeight * 0.9;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 临时解除固定高度以测量内容自然高度，供桌面弹窗高度过渡使用 */
function measurePanelNaturalHeight(panel: HTMLDivElement) {
  const previousHeight = panel.style.height;
  panel.style.height = "auto";
  const naturalHeight = Math.min(panel.getBoundingClientRect().height, getDesktopModalMaxHeight());
  panel.style.height = previousHeight;
  return naturalHeight;
}

function useAnimatedPanelHeight(panelRef: RefObject<HTMLDivElement | null>) {
  const [panelHeight, setPanelHeight] = useState<number | undefined>();
  const [heightTransition, setHeightTransition] = useState(false);

  const measurePanelHeight = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    setPanelHeight(measurePanelNaturalHeight(panel));
  }, [panelRef]);

  useLayoutEffect(() => {
    measurePanelHeight();
  }, [measurePanelHeight]);

  useEffect(() => {
    const timer = setTimeout(() => setHeightTransition(true), 220);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => measurePanelHeight();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [measurePanelHeight]);

  const modalStyle: CSSProperties | undefined =
    panelHeight === undefined
      ? undefined
      : {
          height: panelHeight,
          transition:
            heightTransition && !prefersReducedMotion()
              ? `height ${DESKTOP_HEIGHT_SPRING}`
              : undefined,
        };

  return { modalStyle, measurePanelHeight };
}

// ── Desktop: centered dialog with fade animation ──────────────────────────
function CommentDialog({ targetType, targetId, onClose, onCommentAdded }: CommentModalProps) {
  const { isOpen, requestClose } = useAnimatedClose(onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  const { modalStyle, measurePanelHeight } = useAnimatedPanelHeight(panelRef);

  return (
    <Modal
      isOpen={isOpen}
      isDismissable
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
      aria-label="评论"
      placement="center"
      size="lg"
      overlayClassName="z-[300] bg-black/50"
      modalRef={panelRef}
      modalStyle={modalStyle}
      modalClassName="max-w-[520px] rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
      dialogClassName="flex h-full min-h-0 flex-col overflow-hidden"
    >
      {() => (
        <>
          <header className="relative flex shrink-0 items-center justify-center border-b border-border px-[18px] py-3">
            <h2 className="text-sm font-semibold text-foreground">评论</h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="关闭评论"
              className="absolute right-[18px] flex h-7 w-7 items-center justify-center rounded-lg bg-border text-(--fg2) hover:bg-primary/10 hover:text-primary"
            >
              <SvgIcon name="close" size={16} />
            </button>
          </header>
          <CommentSection
            targetType={targetType}
            targetId={targetId}
            layout="modal"
            onCommentAdded={onCommentAdded}
            onContentResize={measurePanelHeight}
          />
        </>
      )}
    </Modal>
  );
}

// ── Mobile: bottom sheet with gesture ────────────────────────────────────
const SPRING = "0.4s cubic-bezier(.32,.72,0,1)";
const COLLAPSED_HEIGHT = "70dvh";
const EXPANDED_HEIGHT = "100dvh";

function CommentSheet({ targetType, targetId, onClose, onCommentAdded }: CommentModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null!);
  const scrollRef = useRef<HTMLDivElement>(null!);
  const [entered, setEntered] = useState(false);
  const { isOpen, requestClose } = useAnimatedClose(onClose);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const { sheetStyle, isDragging, isExpanded, expandOffset } = useSheetGesture(
    sheetRef,
    scrollRef,
    {
      onDismiss: requestClose,
    },
  );

  const activeHeight =
    expandOffset > 0
      ? `calc(${COLLAPSED_HEIGHT} + ${Math.round(expandOffset)}px)`
      : isExpanded
        ? EXPANDED_HEIGHT
        : COLLAPSED_HEIGHT;

  const mergedStyle: CSSProperties = entered
    ? {
        transform: sheetStyle.transform,
        height: activeHeight,
        maxHeight: EXPANDED_HEIGHT,
        transition: isDragging ? "none" : `transform ${SPRING}, height ${SPRING}`,
        // 手势 dismiss 时（isOpen=false 且 translateY 未归零）禁用退场 CSS 动画：
        // 退场动画的 from{transform:translateY(0)} 以 animation 优先级高于 inline style，
        // 会把已经滑出屏幕的 sheet 拉回原位再重新退场，产生闪烁。
        // 此时 sheet 已通过 CSS transition 滑出，直接让 React Aria 静默移除 DOM 即可。
        animation: !isOpen && sheetStyle.transform !== "translateY(0px)" ? "none" : undefined,
      }
    : {
        transform: "translateY(100%)",
        height: COLLAPSED_HEIGHT,
        maxHeight: EXPANDED_HEIGHT,
        transition: `transform ${SPRING}`,
      };

  return (
    <Modal
      isOpen={isOpen}
      isDismissable
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
      aria-label="评论"
      placement="sheet"
      overlayClassName="z-[300] bg-black/50"
      modalRef={sheetRef}
      modalStyle={mergedStyle}
      modalClassName={cn(
        "touch-manipulation shadow-[0_-4px_40px_rgba(0,0,0,0.18)]",
        isExpanded ? "rounded-none" : "rounded-t-[20px]",
      )}
      dialogClassName="flex h-full min-h-0 flex-col overflow-hidden"
    >
      {() => (
        <>
          <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 cursor-grab rounded-full bg-border active:cursor-grabbing" />
          <header className="relative flex shrink-0 items-center justify-center border-b border-border px-[18px] py-3">
            <h2 className="text-sm font-semibold text-foreground">评论</h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="关闭评论"
              className="absolute right-[18px] flex h-7 w-7 items-center justify-center rounded-lg bg-border text-(--fg2) hover:bg-primary/10 hover:text-primary"
            >
              <SvgIcon name="close" size={16} />
            </button>
          </header>
          <CommentSection
            targetType={targetType}
            targetId={targetId}
            layout="modal"
            scrollRef={scrollRef}
            onCommentAdded={onCommentAdded}
          />
        </>
      )}
    </Modal>
  );
}

// ── Export: switch between desktop and mobile ────────────────────────────
export function CommentModal(props: CommentModalProps) {
  // 弹窗打开时锁定布局，避免媒体查询初始值抖动导致 Sheet/Dialog 切换、重复挂载 CommentSection
  const [isDesktop] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(min-width: 768px)").matches;
  });
  return isDesktop ? <CommentDialog {...props} /> : <CommentSheet {...props} />;
}
