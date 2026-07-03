import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { ViewerTransform } from "../types";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const WHEEL_STEP = 0.0015; // 每单位 deltaY 的缩放系数
const BUTTON_FACTOR = 1.5; // 按钮单次缩放倍率
const DOUBLE_CLICK_SCALE = 2;
const DRAG_THRESHOLD = 8; // 拖拽死区（px），与 useSheetGesture 保持一致

const IDENTITY: ViewerTransform = { scale: 1, x: 0, y: 0, rotation: 0 };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface PointerTracker {
  pointers: Map<number, { x: number; y: number }>;
  startDistance: number;
}

export interface UseViewerTransformResult {
  transform: ViewerTransform;
  /** 指针按下期间为 true，用于禁用 transform 过渡避免捏合/拖拽抖动 */
  isGesturing: boolean;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  rotate: () => void;
  /** 读取并清空「本次指针交互是否发生过拖拽平移」标记，供背景点击关闭判断使用 */
  consumeDrag: () => boolean;
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
  const [isGesturing, setIsGesturing] = useState(false);
  const tracker = useRef<PointerTracker>({ pointers: new Map(), startDistance: 0 });
  // 单指手势起点 + 是否已超过死区，用于抬手后判断这是一次拖拽还是点击
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

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
    setIsGesturing(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const { pointers } = tracker.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY };
      didDrag.current = false;
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      tracker.current.startDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    const { pointers } = tracker.current;
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, next);

    if (pointers.size === 1) {
      const start = dragStart.current;
      if (start && Math.hypot(next.x - start.x, next.y - start.y) > DRAG_THRESHOLD) {
        didDrag.current = true;
      }
      // 单指/鼠标拖拽平移（仅在已放大时生效）
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      setTransform((t) => (t.scale <= MIN_SCALE ? t : { ...t, x: t.x + dx, y: t.y + dy }));
    } else if (pointers.size === 2 && tracker.current.startDistance > 0) {
      // 双指捏合缩放：逐帧相对上一帧距离，避免与 CSS 过渡叠加产生抖动
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = distance / tracker.current.startDistance;
      tracker.current.startDistance = distance;
      setTransform((t) => ({
        ...t,
        scale: clamp(t.scale * factor, MIN_SCALE, MAX_SCALE),
      }));
    }
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    const { pointers } = tracker.current;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) tracker.current.startDistance = 0;
    if (pointers.size === 0) setIsGesturing(false);
  }, []);

  const onDoubleClick = useCallback(() => {
    setTransform((t) => (t.scale > MIN_SCALE ? IDENTITY : { ...t, scale: DOUBLE_CLICK_SCALE }));
  }, []);

  const consumeDrag = useCallback(() => {
    const dragged = didDrag.current;
    didDrag.current = false;
    return dragged;
  }, []);

  return {
    transform,
    isGesturing,
    reset,
    zoomIn,
    zoomOut,
    rotate,
    consumeDrag,
    handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp, onDoubleClick },
  };
}
