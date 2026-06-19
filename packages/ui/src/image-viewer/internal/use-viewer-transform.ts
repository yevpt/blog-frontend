import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { ViewerTransform } from "../types";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const WHEEL_STEP = 0.0015; // 每单位 deltaY 的缩放系数
const BUTTON_FACTOR = 1.5; // 按钮单次缩放倍率
const DOUBLE_CLICK_SCALE = 2;

const IDENTITY: ViewerTransform = { scale: 1, x: 0, y: 0, rotation: 0 };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface PointerTracker {
  pointers: Map<number, { x: number; y: number }>;
  startDistance: number;
  startScale: number;
}

export interface UseViewerTransformResult {
  transform: ViewerTransform;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  rotate: () => void;
  isZoomed: boolean;
  handlers: {
    onWheel: (e: ReactWheelEvent) => void;
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
    onDoubleClick: () => void;
  };
}

export function useViewerTransform(): UseViewerTransformResult {
  const [transform, setTransform] = useState<ViewerTransform>(IDENTITY);
  const tracker = useRef<PointerTracker>({ pointers: new Map(), startDistance: 0, startScale: 1 });

  const reset = useCallback(() => setTransform(IDENTITY), []);

  const zoomBy = useCallback((factor: number) => {
    setTransform((t) => {
      const scale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
      // 缩放回到最小值时归位，避免图像停留在偏移位置
      return scale <= MIN_SCALE ? { ...t, scale, x: 0, y: 0 } : { ...t, scale };
    });
  }, []);

  const zoomIn = useCallback(() => zoomBy(BUTTON_FACTOR), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / BUTTON_FACTOR), [zoomBy]);

  const rotate = useCallback(() => {
    setTransform((t) => ({ ...t, rotation: (t.rotation + 90) % 360 }));
  }, []);

  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    const factor = 1 - e.deltaY * WHEEL_STEP;
    setTransform((t) => {
      const scale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
      // 缩放回到最小值时归位，避免图像停留在偏移位置
      return scale <= MIN_SCALE ? { ...t, scale, x: 0, y: 0 } : { ...t, scale };
    });
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const { pointers } = tracker.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      tracker.current.startDistance = Math.hypot(a.x - b.x, a.y - b.y);
      setTransform((t) => {
        tracker.current.startScale = t.scale;
        return t;
      });
    }
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    const { pointers } = tracker.current;
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, next);

    if (pointers.size === 1) {
      // 单指/鼠标拖拽平移（仅在已放大时生效）
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      setTransform((t) => (t.scale <= MIN_SCALE ? t : { ...t, x: t.x + dx, y: t.y + dy }));
    } else if (pointers.size === 2 && tracker.current.startDistance > 0) {
      // 双指捏合缩放
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = distance / tracker.current.startDistance;
      setTransform((t) => ({
        ...t,
        scale: clamp(tracker.current.startScale * factor, MIN_SCALE, MAX_SCALE),
      }));
    }
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    const { pointers } = tracker.current;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) tracker.current.startDistance = 0;
  }, []);

  const onDoubleClick = useCallback(() => {
    setTransform((t) => (t.scale > MIN_SCALE ? IDENTITY : { ...t, scale: DOUBLE_CLICK_SCALE }));
  }, []);

  return {
    transform,
    reset,
    zoomIn,
    zoomOut,
    rotate,
    isZoomed: transform.scale > MIN_SCALE,
    handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp, onDoubleClick },
  };
}
