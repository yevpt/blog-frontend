"use client";

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { SvgIcon } from "@repo/icons";
import { Modal, cn } from "@repo/ui";
import { useSheetGesture } from "@/hooks/use-sheet-gesture";

interface ResponsiveModalShellProps {
  isOpen: boolean;
  title: ReactNode;
  onClose: () => void;
  /** 桌面弹窗宽度类，默认 max-w-[520px] */
  desktopMaxWidthClassName?: string;
  /** body：自管滚动区；onContentResize 用于桌面高度过渡 */
  children: (args: {
    scrollRef: RefObject<HTMLDivElement>;
    requestClose: () => void;
    onContentResize: () => void;
  }) => ReactNode;
  footer?: ReactNode;
}

interface InnerProps {
  title: ReactNode;
  onClose: () => void;
  desktopMaxWidthClassName?: string;
  children: ResponsiveModalShellProps["children"];
  footer?: ReactNode;
}

/** title 为字符串时用作 aria-label，否则回退到通用文案 */
function ariaLabelFromTitle(title: ReactNode) {
  return typeof title === "string" ? title : "弹窗";
}

// ── 关闭动画：先关闭、延迟触发 onClose 以播放退场动画 ───────────────────────
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
  const previousTransition = panel.style.transition;
  panel.style.transition = "none";
  panel.style.height = "auto";
  const naturalHeight = Math.min(panel.getBoundingClientRect().height, getDesktopModalMaxHeight());
  panel.style.height = previousHeight;
  panel.style.transition = previousTransition;
  return naturalHeight;
}

function useAnimatedPanelHeight(panelRef: RefObject<HTMLDivElement | null>) {
  const [panelHeight, setPanelHeight] = useState<number | undefined>();

  const measurePanelHeight = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    setPanelHeight(measurePanelNaturalHeight(panel));
  }, [panelRef]);

  useLayoutEffect(() => {
    measurePanelHeight();
  }, [measurePanelHeight]);

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
          transition: !prefersReducedMotion() ? `height ${DESKTOP_HEIGHT_SPRING}` : undefined,
        };

  return { modalStyle, measurePanelHeight };
}

// ── 头部（标题居中 + 关闭按钮） ──────────────────────────────────────────────
function ShellHeader({ title, onRequestClose }: { title: ReactNode; onRequestClose: () => void }) {
  return (
    <header className="relative flex shrink-0 items-center justify-center border-b border-border px-[18px] py-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <button
        type="button"
        onClick={onRequestClose}
        aria-label="关闭"
        className="absolute right-[18px] flex h-7 w-7 items-center justify-center rounded-lg bg-border text-(--fg2) hover:bg-primary/10 hover:text-primary"
      >
        <SvgIcon name="close" size={16} />
      </button>
    </header>
  );
}

// ── 桌面：居中弹窗 + 淡入动画 + 高度过渡 ──────────────────────────────────────
function DesktopDialog({ title, onClose, desktopMaxWidthClassName, children, footer }: InnerProps) {
  const { isOpen, requestClose } = useAnimatedClose(onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null!);
  const { modalStyle, measurePanelHeight } = useAnimatedPanelHeight(panelRef);

  return (
    <Modal
      isOpen={isOpen}
      isDismissable
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
      aria-label={ariaLabelFromTitle(title)}
      placement="center"
      size="lg"
      overlayClassName="z-[300] bg-black/50"
      modalRef={panelRef}
      modalStyle={modalStyle}
      modalClassName={cn(
        desktopMaxWidthClassName ?? "max-w-[520px]",
        "rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.18)]",
      )}
      dialogClassName="flex h-full min-h-0 flex-col overflow-hidden"
    >
      {() => (
        <>
          <ShellHeader title={title} onRequestClose={requestClose} />
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            {children({ scrollRef, requestClose, onContentResize: measurePanelHeight })}
          </div>
          {footer ? <div className="shrink-0 border-t border-border">{footer}</div> : null}
        </>
      )}
    </Modal>
  );
}

// ── 移动端：底部 sheet + 手势 ────────────────────────────────────────────────
const SPRING = "0.4s cubic-bezier(.32,.72,0,1)";
const COLLAPSED_HEIGHT = "70dvh";
const EXPANDED_HEIGHT = "100dvh";

function MobileSheet({ title, onClose, children, footer }: InnerProps) {
  const sheetRef = useRef<HTMLDivElement>(null!);
  const scrollRef = useRef<HTMLDivElement>(null!);
  const [entered, setEntered] = useState(false);
  const { isOpen, requestClose } = useAnimatedClose(onClose);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const { sheetStyle, isDragging, isExpanded, expandOffset } = useSheetGesture(sheetRef, scrollRef, {
    onDismiss: requestClose,
  });

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
      aria-label={ariaLabelFromTitle(title)}
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
          <ShellHeader title={title} onRequestClose={requestClose} />
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto"
            style={{ overscrollBehavior: "contain" }}
          >
            {children({ scrollRef, requestClose, onContentResize: () => {} })}
          </div>
          {footer ? <div className="shrink-0 border-t border-border">{footer}</div> : null}
        </>
      )}
    </Modal>
  );
}

// ── 导出：打开时锁定桌面/移动端布局，避免媒体查询初始值抖动重复挂载 ───────────
export function ResponsiveModalShell({ isOpen, ...rest }: ResponsiveModalShellProps) {
  const [isDesktop] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(min-width: 768px)").matches;
  });

  if (!isOpen) return null;

  return isDesktop ? <DesktopDialog {...rest} /> : <MobileSheet {...rest} />;
}

export type { ResponsiveModalShellProps };
