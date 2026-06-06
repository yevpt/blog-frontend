"use client";

import { useRef, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { SvgIcon } from "@repo/icons";
import { useSheetGesture } from "@/hooks/use-sheet-gesture";
import { CommentSection } from "./comment-section";

type TargetType = "article" | "moment";

interface CommentModalProps {
  targetType: TargetType;
  targetId: number;
  onClose: () => void;
}

const SPRING = "0.4s cubic-bezier(.32,.72,0,1)";

export function CommentModal({ targetType, targetId, onClose }: CommentModalProps) {
  const sheetRef = useRef<HTMLElement>(null!);
  const scrollRef = useRef<HTMLDivElement>(null!);

  // 入场动画：挂载时 translateY=100%，RAF 后 spring 滑入
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 手势引擎：暴露 isExpanded 供高度切换
  const { sheetStyle, isDragging, isExpanded } = useSheetGesture(sheetRef, scrollRef, {
    onDismiss: onClose,
  });

  // body scroll lock
  useEffect(() => {
    const savedScrollY = window.scrollY;
    document.body.style.cssText = `overflow:hidden;position:fixed;top:-${savedScrollY}px;width:100%`;
    return () => {
      document.body.style.cssText = "";
      window.scrollTo(0, savedScrollY);
    };
  }, []);

  // 合并 transform + height + transition 为单一 style 对象：
  //
  //   未入场：translateY(100%) + spring，高度 70dvh（折叠起始）
  //   已入场：
  //     - 拖动中：transition:none（手势跟手，无过渡）
  //     - 释放后：transform spring（弹回 / dismiss）+ height spring（展开 / 收起）
  //
  // 注意：transition 是单一 CSS 属性，必须在同一 style 声明中列全所有需要动画的属性，
  // 否则 className 里的 transition-* 会被 inline style 覆盖。
  const mergedStyle: CSSProperties = entered
    ? {
        transform: sheetStyle.transform,
        height: isExpanded ? "92dvh" : "70dvh",
        maxHeight: "92dvh",
        transition: isDragging ? "none" : `transform ${SPRING}, height ${SPRING}`,
      }
    : {
        transform: "translateY(100%)",
        height: "70dvh",
        maxHeight: "92dvh",
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
      {/* Sheet 主体 */}
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="评论"
        style={mergedStyle}
        className="
          touch-manipulation
          relative flex w-full flex-col overflow-hidden rounded-t-[20px] bg-card
          shadow-[0_-4px_40px_rgba(0,0,0,0.18)]
          md:h-auto md:max-h-[85vh] md:max-w-[520px] md:rounded-[20px_20px_16px_16px]
        "
      >
        {/* 拖动把手（移动端）——touch 起点在此即为 isHeaderGesture=true */}
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 cursor-grab rounded-full bg-border active:cursor-grabbing md:hidden" />

        {/* Header：居中「评论」，右侧关闭按钮绝对定位 */}
        <header className="relative flex shrink-0 items-center justify-center border-b border-border px-[18px] py-3">
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

        {/* 评论内容（scrollRef 给手势引擎读 scrollTop / getBoundingClientRect） */}
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
