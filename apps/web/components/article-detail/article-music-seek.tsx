"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { cn } from "@repo/ui";

interface MusicSeekProps {
  /** 当前进度 0..1 */
  progress: number;
  /** 屏幕阅读器读出的进度文案，如「01:18 / 03:42」 */
  valueText: string;
  disabled?: boolean;
  className?: string;
  /** 提交新的进度比例 0..1；commit 为 true 表示点击/拖拽结束/键盘确认 */
  onSeek: (ratio: number, commit?: boolean) => void;
}

const STEP = 0.02;
const PAGE_STEP = 0.1;

/** 随文配乐进度条：贴底通栏，支持点击 / 拖拽 / 键盘切换播放位置（role=slider + 完整 ARIA） */
export function MusicSeek({ progress, valueText, disabled, className, onSeek }: MusicSeekProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const percent = Math.min(100, Math.max(0, progress * 100));

  const clampSeek = (next: number, commit = false) =>
    onSeek(Math.min(1, Math.max(0, next)), commit);

  const seekFromClientX = (clientX: number, commit = false) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    clampSeek((clientX - rect.left) / rect.width, commit);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    seekFromClientX(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromClientX(event.clientX);
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    seekFromClientX(event.clientX, true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => clampSeek(progress - STEP, true),
      ArrowDown: () => clampSeek(progress - STEP, true),
      ArrowRight: () => clampSeek(progress + STEP, true),
      ArrowUp: () => clampSeek(progress + STEP, true),
      PageDown: () => clampSeek(progress - PAGE_STEP, true),
      PageUp: () => clampSeek(progress + PAGE_STEP, true),
      Home: () => clampSeek(0, true),
      End: () => clampSeek(1, true),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="播放进度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "group/seek relative flex touch-none select-none items-center outline-none",
        disabled ? "cursor-default" : "cursor-pointer",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={handleKeyDown}
    >
      <div className="relative h-[3px] w-full rounded-full bg-foreground/[0.09] dark:bg-border/80">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/45 dark:bg-foreground/55"
          style={{ width: `${percent}%` }}
        />
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
            "border border-foreground/10 bg-card shadow-sm dark:bg-foreground",
            "opacity-0 transition-opacity duration-150",
            "group-hover/seek:opacity-100 group-focus-visible/seek:opacity-100 group-active/seek:opacity-100",
          )}
          style={{ left: `${percent}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
