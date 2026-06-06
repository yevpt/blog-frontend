// apps/web/hooks/use-sheet-gesture.ts
"use client";

import { type CSSProperties, type RefObject, useEffect, useRef, useState } from "react";

interface SheetGestureOptions {
  snapThreshold?: number;
  velocityThreshold?: number;
  minDisplacement?: number;
  onDismiss: () => void;
}

type GestureMode = "undecided" | "drag" | "scroll";

interface GestureState {
  startY: number;
  startScrollTop: number;
  mode: GestureMode;
  velocitySamples: Array<{ y: number; t: number }>;
  rubberBandStartY?: number;
  lastY: number;
}

export function useSheetGesture(
  sheetRef: RefObject<HTMLElement | null>,
  scrollRef: RefObject<HTMLElement | null>,
  {
    snapThreshold = 0.3,
    velocityThreshold = 600,
    minDisplacement = 60,
    onDismiss,
  }: SheetGestureOptions,
): { sheetStyle: CSSProperties; isDragging: boolean } {
  const translateYRef = useRef(0);
  const [translateY, _setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const gestureRef = useRef<GestureState | null>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; });

  useEffect(() => {
    const sheet = sheetRef.current;
    const scroll = scrollRef.current;
    if (!sheet || !scroll) return;

    scroll.style.overscrollBehaviorY = "contain";

    function setTranslateY(val: number) {
      translateYRef.current = val;
      _setTranslateY(val);
    }

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      gestureRef.current = {
        startY: touch.clientY,
        startScrollTop: scroll!.scrollTop,
        mode: "undecided",
        velocitySamples: [],
        lastY: touch.clientY,
      };
    }

    function onTouchMove(e: TouchEvent) {
      const state = gestureRef.current;
      const touch = e.touches[0];
      if (!state || !touch) return;

      const deltaY = touch.clientY - state.startY;
      const now = Date.now();

      state.velocitySamples.push({ y: touch.clientY, t: now });
      state.velocitySamples = state.velocitySamples.filter((s) => now - s.t <= 100);

      if (state.startScrollTop === 0 && deltaY > 0 && state.mode === "undecided") {
        e.preventDefault();
      }

      if (state.mode === "undecided" && Math.abs(deltaY) > 8) {
        const isDragDown = state.startScrollTop === 0 && deltaY > 0;
        state.mode = isDragDown ? "drag" : "scroll";
        if (isDragDown) setIsDragging(true);
      }

      if (state.mode === "drag") {
        e.preventDefault();
        const ty = deltaY >= 0 ? deltaY : deltaY * 0.2;
        setTranslateY(Math.max(ty, 0));
        state.lastY = touch.clientY;
        return;
      }

      if (state.mode === "scroll") {
        const currentScrollTop = scroll!.scrollTop;
        const movingDown = touch.clientY > state.lastY;

        if (currentScrollTop <= 0 && movingDown) {
          if (state.rubberBandStartY === undefined) {
            state.rubberBandStartY = touch.clientY;
          }
          const rubberDelta = Math.max(touch.clientY - state.rubberBandStartY, 0);
          setTranslateY(Math.min(rubberDelta * 0.25, 40));
        } else {
          state.rubberBandStartY = undefined;
          setTranslateY(0);
        }
      }

      state.lastY = touch.clientY;
    }

    function onTouchEnd() {
      const state = gestureRef.current;
      gestureRef.current = null;
      setIsDragging(false);

      if (!state || state.mode !== "drag") {
        setTranslateY(0);
        return;
      }

      const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
      const displacement = translateYRef.current;

      const samples = state.velocitySamples;
      let velocity = 0;
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0) velocity = (last.y - first.y) / dt;
      }

      const shouldDismiss =
        displacement > sheetHeight * snapThreshold ||
        (velocity > velocityThreshold && displacement > minDisplacement);

      if (shouldDismiss) {
        setTranslateY(sheetHeight);
        setTimeout(() => onDismissRef.current(), 350);
      } else {
        setTranslateY(0);
      }
    }

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", onTouchEnd, { passive: true });
    sheet.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", onTouchEnd);
      sheet.removeEventListener("touchcancel", onTouchEnd);
      scroll.style.overscrollBehaviorY = "";
    };
  }, [sheetRef, scrollRef, snapThreshold, velocityThreshold, minDisplacement]);

  const sheetStyle: CSSProperties = {
    transform: `translateY(${translateY}px)`,
    transition: isDragging ? "none" : "transform 0.35s cubic-bezier(.32,.72,0,1)",
    willChange: "transform",
  };

  return { sheetStyle, isDragging };
}
