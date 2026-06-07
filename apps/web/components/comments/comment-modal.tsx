"use client";

import { useRef, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { SvgIcon } from "@repo/icons";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSheetGesture } from "@/hooks/use-sheet-gesture";
import { CommentSection } from "./comment-section";

type TargetType = "article" | "moment";

interface CommentModalProps {
  targetType: TargetType;
  targetId: number;
  onClose: () => void;
  onCommentAdded?: () => void;
}

function useBodyScrollLock() {
  useEffect(() => {
    const savedScrollY = window.scrollY;
    document.body.style.cssText = `overflow:hidden;position:fixed;top:-${savedScrollY}px;width:100%`;
    return () => {
      document.body.style.cssText = "";
      window.scrollTo(0, savedScrollY);
    };
  }, []);
}

// ── Desktop: centered dialog with fade animation ──────────────────────────
function CommentDialog({ targetType, targetId, onClose, onCommentAdded }: CommentModalProps) {
  const [entered, setEntered] = useState(false);
  useBodyScrollLock();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300"
      style={{ opacity: entered ? 1 : 0 }}
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="评论"
        className={`flex w-full max-w-[520px] max-h-[85vh] flex-col overflow-hidden rounded-[20px] bg-card shadow-[0_8px_40px_rgba(0,0,0,0.18)] transition-all duration-300 ${entered ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        <header className="relative flex shrink-0 items-center justify-center border-b border-border px-[18px] py-3">
          <h2 className="text-sm font-semibold text-foreground">评论</h2>
          <button
            type="button"
            onClick={onClose}
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
        />
      </section>
    </div>
  );
}

// ── Mobile: bottom sheet with gesture ────────────────────────────────────
const SPRING = "0.4s cubic-bezier(.32,.72,0,1)";
const COLLAPSED_HEIGHT = "70dvh";
const EXPANDED_HEIGHT = "100dvh";

function CommentSheet({ targetType, targetId, onClose, onCommentAdded }: CommentModalProps) {
  const sheetRef = useRef<HTMLElement>(null!);
  const scrollRef = useRef<HTMLDivElement>(null!);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const { sheetStyle, isDragging, isExpanded, expandOffset } = useSheetGesture(
    sheetRef,
    scrollRef,
    {
      onDismiss: onClose,
    },
  );

  useBodyScrollLock();

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
      }
    : {
        transform: "translateY(100%)",
        height: COLLAPSED_HEIGHT,
        maxHeight: EXPANDED_HEIGHT,
        transition: `transform ${SPRING}`,
      };

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="评论"
        style={mergedStyle}
        className={`touch-manipulation absolute bottom-0 left-0 right-0 mx-auto flex w-full flex-col overflow-hidden bg-card shadow-[0_-4px_40px_rgba(0,0,0,0.18)] ${isExpanded ? "rounded-none" : "rounded-t-[20px]"}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 cursor-grab rounded-full bg-border active:cursor-grabbing" />
        <header className="relative flex shrink-0 items-center justify-center border-b border-border px-[18px] py-3">
          <h2 className="text-sm font-semibold text-foreground">评论</h2>
          <button
            type="button"
            onClick={onClose}
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
      </section>
    </div>
  );
}

// ── Export: switch between desktop and mobile ────────────────────────────
export function CommentModal(props: CommentModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? <CommentDialog {...props} /> : <CommentSheet {...props} />;
}
