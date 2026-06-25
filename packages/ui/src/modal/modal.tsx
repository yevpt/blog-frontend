"use client";

import type { MouseEvent } from "react";
import { Dialog, Modal as AriaModal, ModalOverlay } from "react-aria-components/Modal";
import { cn } from "../lib/utils";
import type { ModalPlacement, ModalProps, ModalSize } from "./types";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-[360px]",
  md: "max-w-[440px]",
  lg: "max-w-[520px]",
  xl: "max-w-[640px]",
  full: "max-w-none",
};

// fullscreen-mobile 在移动端需要真正全屏（无 max-width 限制），
// 仅在 md: 及以上断点应用尺寸限制。必须显式列出完整类名以便 Tailwind JIT 扫描。
const sizeClassesAtMd: Record<ModalSize, string> = {
  sm: "md:max-w-[360px]",
  md: "md:max-w-[440px]",
  lg: "md:max-w-[520px]",
  xl: "md:max-w-[640px]",
  full: "md:max-w-none",
};

const positionerClasses: Record<ModalPlacement, string> = {
  center: "items-center justify-center p-4",
  sheet: "items-end justify-center",
  "fullscreen-mobile":
    "max-md:contents md:flex md:min-h-full md:w-full md:items-center md:justify-center md:p-4",
};

const modalClasses: Record<ModalPlacement, string> = {
  center:
    "relative w-full overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl outline-none",
  sheet:
    "absolute inset-x-0 bottom-0 mx-auto flex w-full flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card text-foreground shadow-2xl outline-none",
  "fullscreen-mobile":
    "relative flex min-h-0 w-full max-w-full flex-col overflow-x-hidden border-t border-border bg-card text-foreground shadow-2xl outline-none max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:flex max-md:max-h-dvh max-md:w-auto max-md:max-w-none max-md:rounded-none md:mx-auto md:overflow-hidden md:rounded-2xl md:border",
};

export function Modal({
  children,
  placement = "center",
  size = "md",
  overlayClassName,
  positionerClassName,
  modalClassName,
  modalRef,
  dialogClassName,
  overlayStyle,
  modalStyle,
  onBackdropPress,
  role,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...overlayProps
}: ModalProps) {
  return (
    <ModalOverlay
      {...overlayProps}
      style={overlayStyle}
      data-testid="modal-overlay"
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        overlayProps.onClick?.(event);
        if (event.target === event.currentTarget) onBackdropPress?.();
      }}
      className={({ isExiting }) =>
        cn(
          "ui-modal-overlay fixed inset-0 isolate z-50 flex overflow-x-hidden bg-black/40 text-left backdrop-blur-sm",
          isExiting ? "ui-modal-overlay-exit" : "ui-modal-overlay-enter",
          overlayClassName,
        )
      }
    >
      {onBackdropPress && (
        <button
          type="button"
          aria-label="弹窗背景"
          data-testid="modal-backdrop"
          tabIndex={-1}
          className="absolute inset-0 z-0 cursor-default"
          onClick={onBackdropPress}
        />
      )}
      <div
        data-testid="modal-positioner"
        className={cn(
          "relative z-10 flex min-h-full w-full",
          onBackdropPress && "pointer-events-none",
          positionerClasses[placement],
          positionerClassName,
        )}
      >
        <AriaModal
          ref={modalRef}
          style={modalStyle}
          data-testid="modal-panel"
          className={({ isExiting }) =>
            cn(
              "ui-modal-panel",
              modalClasses[placement],
              onBackdropPress && "pointer-events-auto",
              placement === "center" && "ui-modal-panel-center",
              placement === "sheet" && "ui-modal-panel-sheet",
              placement === "fullscreen-mobile" && "ui-modal-panel-fullscreen-mobile",
              placement === "center" && sizeClasses[size],
              placement === "fullscreen-mobile" && sizeClassesAtMd[size],
              placement === "center" && "max-h-[calc(var(--visual-viewport-height,100vh)*0.9)]",
              placement === "fullscreen-mobile" &&
                "md:max-h-[calc(var(--visual-viewport-height,100vh)*0.9)]",
              isExiting
                ? "ui-modal-panel-exit"
                : placement === "fullscreen-mobile"
                  ? "ui-modal-panel-fullscreen-mobile-enter"
                  : "ui-modal-panel-enter",
              modalClassName,
            )
          }
        >
          <Dialog
            role={role}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={cn(
              "flex w-full min-w-0 max-w-full flex-col outline-none",
              placement === "fullscreen-mobile"
                ? "min-h-0 flex-1 max-h-full overflow-x-hidden md:h-full"
                : "max-h-[inherit]",
              dialogClassName,
            )}
          >
            {children}
          </Dialog>
        </AriaModal>
      </div>
    </ModalOverlay>
  );
}
