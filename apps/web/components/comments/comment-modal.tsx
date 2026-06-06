"use client";

import { useRef, useEffect } from "react";
import { SvgIcon } from "@repo/icons";
import { useSheetGesture } from "@/hooks/use-sheet-gesture";
import { CommentSection } from "./comment-section";

type TargetType = "article" | "moment";

interface CommentModalProps {
  open: boolean;
  targetType: TargetType;
  targetId: number;
  onClose: () => void;
}

export function CommentModal({ open, targetType, targetId, onClose }: CommentModalProps) {
  const sheetRef = useRef<HTMLElement>(null!);
  const scrollRef = useRef<HTMLDivElement>(null!);

  const { sheetStyle, isDragging } = useSheetGesture(
    sheetRef,
    scrollRef,
    { onDismiss: onClose },
  );

  // [防御3] body scroll lock：sheet 打开时锁定 body，防止底层页面滚动穿透
  useEffect(() => {
    if (!open) return;
    const savedScrollY = window.scrollY;
    document.body.style.cssText = `overflow:hidden;position:fixed;top:-${savedScrollY}px;width:100%`;
    return () => {
      document.body.style.cssText = "";
      window.scrollTo(0, savedScrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    // 遮罩层
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Sheet 主体：移动端全宽 70dvh，PC 端固定宽度卡片 */}
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="评论"
        style={isDragging ? { ...sheetStyle } : sheetStyle}
        className="
          relative flex w-full flex-col overflow-hidden rounded-t-[20px] bg-card shadow-[0_-4px_40px_rgba(0,0,0,0.18)]
          [height:70dvh] [max-height:92dvh]
          md:relative md:inset-auto md:h-auto md:max-h-[85vh] md:max-w-[520px] md:rounded-[20px_20px_16px_16px]
          animate-[slideUpSheet_0.4s_cubic-bezier(.32,.72,0,1)]
        "
      >
        {/* 拖动把手 */}
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 cursor-grab rounded-full bg-border active:cursor-grabbing md:hidden" />

        {/* Header：居中"评论"，右侧关闭按钮 */}
        <header className="flex shrink-0 items-center justify-center border-b border-border px-[18px] py-3">
          <h2 className="text-sm font-semibold text-foreground">评论</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭评论"
            className="absolute right-[18px] flex h-7 w-7 items-center justify-center rounded-lg bg-border text-[var(--fg2)] hover:bg-primary/10 hover:text-primary"
          >
            <SvgIcon name="close" size={16} />
          </button>
        </header>

        {/* CommentSection（modal layout，传入 scrollRef 供手势引擎读 scrollTop） */}
        <CommentSection
          targetType={targetType}
          targetId={targetId}
          layout="modal"
          scrollRef={scrollRef}
        />
      </section>
    </div>
  );
}
