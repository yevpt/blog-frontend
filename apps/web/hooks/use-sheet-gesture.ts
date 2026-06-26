// apps/web/hooks/use-sheet-gesture.ts
/* global document, HTMLElement, MouseEvent, TouchEvent, window */
"use client";

/**
 * useSheetGesture — bottom sheet 手势引擎
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  STATE MACHINE                                                          │
 * │                                                                         │
 * │  snapState:  "collapsed" (70dvh) ←──────────────→ "expanded" (100dvh)  │
 * │                    │  ↑ swipe-up from header               │            │
 * │                    │  ↓ swipe-down from header (collapse)   │            │
 * │                    ↓                                                    │
 * │               DISMISSED (onDismiss called)                              │
 * │                                                                         │
 * │  gestureMode (per-touch):                                               │
 * │    "undecided" → (>8px movement) → "drag" | "scroll"                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 触摸区域分类（onTouchStart 时判定）：
 *   isHeaderGesture = true  → touch.clientY < scrollRef.top（handle / header 区域）
 *   isHeaderGesture = false → 在滚动容器内或输入区
 *
 * drag 模式触发条件：
 *   - header 手势：无论方向，超过 8px 死区即进入 drag
 *   - 滚动区手势：scrollTop≤1 且向下，才进入 drag（否则进入 scroll）
 *
 * 速度计算：touchend 时取 100ms 滑动窗口内的首尾两点 → px/s
 *
 * dismiss 条件（collapsed 状态向下）：
 *   displacement > sheetHeight × snapThreshold  OR
 *   (velocity > velocityThreshold AND displacement > minDisplacement)
 *
 * expand 条件（collapsed 状态向上）：
 *   expandOffset > 40px  OR  velocity < -velocityThreshold
 *
 * collapse 条件（expanded 状态向下）：同 dismiss 条件，但改为收起而非关闭
 */

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface SheetGestureOptions {
  snapThreshold?: number; // dismiss/collapse 位移阈值（占 sheetHeight 比例）
  velocityThreshold?: number; // dismiss/collapse/expand 速度阈值（px/s）
  minDisplacement?: number; // 速度触发时的最小位移（px）
  onDismiss: () => void;
}

type GestureMode = "undecided" | "drag" | "scroll";

interface GestureState {
  startY: number;
  startScrollTop: number;
  maxExpandOffset: number;
  mode: GestureMode;
  /** touch 起点在 scrollRef 上方（handle/header 区域） */
  isHeaderGesture: boolean;
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
): {
  sheetStyle: CSSProperties;
  isDragging: boolean;
  isExpanded: boolean;
  expandOffset: number;
  /** 不经手势、直接切换到 expanded(100dvh)，供内容溢出时主动撑高 sheet */
  expand: () => void;
} {
  const translateYRef = useRef(0);
  const [translateY, _setTranslateY] = useState(0);
  const expandOffsetRef = useRef(0);
  const [expandOffset, _setExpandOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // snapState：collapsed(70dvh) 或 expanded(100dvh)
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false); // Ref 版本供闭包内同步读取

  const expand = useCallback(() => {
    if (isExpandedRef.current) return;
    isExpandedRef.current = true;
    setIsExpanded(true);
  }, []);

  const gestureRef = useRef<GestureState | null>(null);
  const onDismissRef = useRef(onDismiss);
  // 每次 render 同步 onDismiss，避免闭包过时
  useLayoutEffect(() => {
    onDismissRef.current = onDismiss;
  });

  // 使用 useEffect（而非 useLayoutEffect）确保在浏览器绘制后、portal 元素完全挂载、
  // refs 就绪后再绑定事件。对于 React Aria Modal（portal 渲染），useObjectRef 通过
  // proxy setter 同步传递 ref，但在 React 19 中某些场景下可能晚于父组件的
  // useLayoutEffect，改用 useEffect 规避此时序问题。
  useEffect(() => {
    const sheet = sheetRef.current;
    const scroll = scrollRef.current;
    if (!sheet || !scroll) return;

    // [防御1] 滚动容器禁止原生 overscroll，防止触发 pull-to-refresh
    scroll.style.overscrollBehaviorY = "contain";

    function setTranslateY(val: number) {
      translateYRef.current = val;
      _setTranslateY(val);
    }

    function setExpandOffset(val: number) {
      expandOffsetRef.current = val;
      _setExpandOffset(val);
    }

    // ─── Phase 1: gesture start ──────────────────────────────────────────────
    // 判断手势起点是否在 handle/header 区域（scrollRef 上方）。
    // 使用 scrollRef.getBoundingClientRect().top 作为分界线：
    //   clientY < scrollRect.top  → header 手势（handle + header）
    //   clientY >= scrollRect.top → 滚动区 or 输入区
    function startGesture(clientY: number) {
      const scrollRect = scroll!.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      gestureRef.current = {
        startY: clientY,
        startScrollTop: scroll!.scrollTop,
        maxExpandOffset: Math.max(viewportHeight - sheet!.offsetHeight, 0),
        mode: "undecided",
        isHeaderGesture: clientY < scrollRect.top,
        velocitySamples: [],
        lastY: clientY,
      };
      setExpandOffset(0);
    }

    // ─── Phase 2: gesture move ───────────────────────────────────────────────
    function moveGesture(clientY: number, preventDefault: () => void) {
      const state = gestureRef.current;
      if (!state) return;

      const deltaY = clientY - state.startY;
      const now = Date.now();

      // 速度采样：100ms 滑动窗口
      state.velocitySamples.push({ y: clientY, t: now });
      state.velocitySamples = state.velocitySamples.filter((s) => now - s.t <= 100);

      // [防御2] undecided 阶段即刻 preventDefault，防止浏览器提前决定滚动方向
      if (state.mode === "undecided") {
        if (state.isHeaderGesture || (state.startScrollTop <= 1 && deltaY > 0)) {
          preventDefault();
        }
      }

      // ── 模式判定（首次超过 8px 死区后锁定）────────────────────────────────
      if (state.mode === "undecided" && Math.abs(deltaY) > 8) {
        if (state.isHeaderGesture) {
          // handle/header：无论方向都进入 drag
          state.mode = "drag";
          setIsDragging(true);
        } else {
          // 滚动区：仅 scrollTop≤1 且向下 → drag；否则 → scroll
          const isDragDown = state.startScrollTop <= 1 && deltaY > 0;
          state.mode = isDragDown ? "drag" : "scroll";
          if (isDragDown) setIsDragging(true);
        }
      }

      // ── drag 模式：translateY 跟手 ──────────────────────────────────────────
      if (state.mode === "drag") {
        preventDefault();
        if (deltaY >= 0) {
          // 向下拖动：正 translateY（dismiss / collapse 方向）
          setExpandOffset(0);
          setTranslateY(deltaY);
        } else {
          // 向上拖动：通过增加高度跟手，底部保持锚定，不移动整个 sheet。
          const nextOffset = Math.min(Math.abs(deltaY), state.maxExpandOffset);
          setTranslateY(0);
          setExpandOffset(isExpandedRef.current ? 0 : nextOffset);
        }
        state.lastY = clientY;
        return;
      }

      // ── scroll 模式：到顶后向下时给 sheet 轻微橡皮筋 ─────────────────────
      if (state.mode === "scroll") {
        const currentScrollTop = scroll!.scrollTop;
        const movingDown = clientY > state.lastY;
        if (currentScrollTop <= 0 && movingDown) {
          if (state.rubberBandStartY === undefined) {
            state.rubberBandStartY = clientY;
          }
          const rubberDelta = Math.max(clientY - state.rubberBandStartY, 0);
          setExpandOffset(0);
          setTranslateY(Math.min(rubberDelta * 0.25, 40));
        } else {
          state.rubberBandStartY = undefined;
          setExpandOffset(0);
          setTranslateY(0);
        }
      }

      state.lastY = clientY;
    }

    // ─── Phase 3: gesture end ────────────────────────────────────────────────
    function endGesture() {
      const state = gestureRef.current;
      gestureRef.current = null;
      setIsDragging(false);

      if (!state || state.mode !== "drag") {
        setExpandOffset(0);
        setTranslateY(0);
        return;
      }

      const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
      const displacement = translateYRef.current;
      const expansion = expandOffsetRef.current;

      // 速度计算（正 = 向下，负 = 向上）
      const samples = state.velocitySamples;
      let velocity = 0;
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0) velocity = (last.y - first.y) / dt;
      }

      // ── 向上手势：决定是否展开至全屏 ──────────────────────────────────────
      if (expansion > 0 || state.lastY < state.startY) {
        const shouldExpand =
          !isExpandedRef.current && (expansion > 40 || velocity < -velocityThreshold);
        if (shouldExpand) {
          isExpandedRef.current = true;
          setIsExpanded(true);
        }
        setExpandOffset(0);
        setTranslateY(0);
        return;
      }

      // ── 向下手势：dismiss（collapsed） 或 collapse（expanded） ────────────
      const shouldDismissOrCollapse =
        displacement > sheetHeight * snapThreshold ||
        (velocity > velocityThreshold && displacement > minDisplacement);

      if (shouldDismissOrCollapse) {
        if (isExpandedRef.current) {
          // 展开 → 收起（不 dismiss）
          isExpandedRef.current = false;
          setIsExpanded(false);
          setExpandOffset(0);
          setTranslateY(0);
        } else {
          // 收起 → dismiss
          // 等待 CSS transition（0.4s SPRING）完成后再触发 onDismiss，
          // 防止退场 CSS 动画（uiModalSheetOut）与进行中的 transition 冲突。
          setExpandOffset(0);
          setTranslateY(sheetHeight);
          setTimeout(() => onDismissRef.current(), 420);
        }
      } else {
        setExpandOffset(0);
        setTranslateY(0);
      }
    }

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      startGesture(touch.clientY);
    }

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      moveGesture(touch.clientY, () => e.preventDefault());
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      startGesture(e.clientY);
    }

    function onMouseMove(e: MouseEvent) {
      moveGesture(e.clientY, () => e.preventDefault());
    }

    function onMouseUp() {
      endGesture();
    }

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", endGesture, { passive: true });
    sheet.addEventListener("touchcancel", endGesture, { passive: true });
    sheet.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", endGesture);
      sheet.removeEventListener("touchcancel", endGesture);
      sheet.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      scroll.style.overscrollBehaviorY = "";
    };
  }, [sheetRef, scrollRef, snapThreshold, velocityThreshold, minDisplacement]);

  const sheetStyle: CSSProperties = {
    transform: `translateY(${translateY}px)`,
    transition: isDragging ? "none" : "transform 0.35s cubic-bezier(.32,.72,0,1)",
  };

  return { sheetStyle, isDragging, isExpanded, expandOffset, expand };
}
