import { useCallback, useRef, useState } from "react";
import type { DOMAttributes, PointerEvent } from "react";

const DEFAULT_THRESHOLD_MS = 500;

interface UseNotificationCardLongPressOptions {
  disabled?: boolean;
  onLongPress: () => void;
  thresholdMs?: number;
}

function clearDocumentSelection() {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) selection.removeAllRanges();
}

/** 移动端长按进入选择模式；桌面端仍靠 hover 勾选框。 */
export function useNotificationCardLongPress({
  disabled = false,
  onLongPress,
  thresholdMs = DEFAULT_THRESHOLD_MS,
}: UseNotificationCardLongPressOptions): {
  longPressProps: DOMAttributes<HTMLElement>;
  consumeLongPressClick: () => boolean;
  isTouchPressing: boolean;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const isTouchPressingRef = useRef(false);
  const pressTargetRef = useRef<HTMLElement | null>(null);
  const selectionGuardRef = useRef<((event: Event) => void) | null>(null);
  const [isTouchPressing, setIsTouchPressing] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const detachSelectionGuard = useCallback((target?: HTMLElement | null) => {
    const element = target ?? pressTargetRef.current;
    const handler = selectionGuardRef.current;
    if (element && handler) {
      element.removeEventListener("selectstart", handler, { capture: true });
    }
    selectionGuardRef.current = null;
    if (!target || target === pressTargetRef.current) {
      pressTargetRef.current = null;
    }
  }, []);

  const attachSelectionGuard = useCallback(
    (target: HTMLElement) => {
      detachSelectionGuard();
      const handler = (event: Event) => {
        if (isTouchPressingRef.current) event.preventDefault();
      };
      selectionGuardRef.current = handler;
      pressTargetRef.current = target;
      target.addEventListener("selectstart", handler, { capture: true });
    },
    [detachSelectionGuard],
  );

  const endTouchPress = useCallback(
    (event?: PointerEvent<HTMLElement>) => {
      clearTimer();
      detachSelectionGuard(event?.currentTarget ?? null);
      isTouchPressingRef.current = false;
      setIsTouchPressing(false);
    },
    [clearTimer, detachSelectionGuard],
  );

  const handleLongPress = useCallback(() => {
    clearDocumentSelection();
    longPressTriggeredRef.current = true;
    onLongPress();
  }, [onLongPress]);

  const consumeLongPressClick = useCallback(() => {
    if (!longPressTriggeredRef.current) return false;
    longPressTriggeredRef.current = false;
    return true;
  }, []);

  const startLongPress = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (disabled || event.pointerType === "mouse") return;
      clearTimer();
      longPressTriggeredRef.current = false;
      isTouchPressingRef.current = true;
      setIsTouchPressing(true);
      attachSelectionGuard(event.currentTarget);
      timerRef.current = setTimeout(handleLongPress, thresholdMs);
    },
    [attachSelectionGuard, clearTimer, disabled, handleLongPress, thresholdMs],
  );

  const longPressProps: DOMAttributes<HTMLElement> = {
    onPointerDown: startLongPress,
    onPointerUp: endTouchPress,
    onPointerLeave: endTouchPress,
    onPointerCancel: endTouchPress,
    onContextMenu: (event) => {
      if (disabled) return;
      const nativeEvent = event.nativeEvent;
      if (
        "pointerType" in nativeEvent &&
        (nativeEvent as unknown as PointerEvent).pointerType === "mouse"
      ) {
        return;
      }
      event.preventDefault();
    },
  };

  return { longPressProps, consumeLongPressClick, isTouchPressing };
}
