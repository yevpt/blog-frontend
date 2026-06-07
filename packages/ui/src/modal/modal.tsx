"use client";

import type { CSSProperties, MouseEvent, ReactNode, Ref } from "react";
import {
  Dialog,
  Modal as AriaModal,
  ModalOverlay,
  type DialogProps,
  type DialogRenderProps,
  type ModalOverlayProps as AriaModalOverlayProps,
} from "react-aria-components/Modal";
import { cn } from "../lib/utils";

export type ModalPlacement = "center" | "sheet" | "fullscreen-mobile";
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps
  extends
    Omit<AriaModalOverlayProps, "children" | "className" | "style">,
    Pick<DialogProps, "aria-label" | "aria-labelledby" | "role"> {
  children: ReactNode | ((opts: DialogRenderProps) => ReactNode);
  placement?: ModalPlacement;
  size?: ModalSize;
  overlayClassName?: string;
  positionerClassName?: string;
  modalClassName?: string;
  modalRef?: Ref<HTMLDivElement>;
  dialogClassName?: string;
  overlayStyle?: CSSProperties;
  modalStyle?: CSSProperties;
  onBackdropPress?: () => void;
}

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
  "fullscreen-mobile": "items-end justify-center md:items-center md:p-4",
};

const modalClasses: Record<ModalPlacement, string> = {
  center:
    "relative w-full overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl outline-none",
  sheet:
    "absolute inset-x-0 bottom-0 mx-auto flex w-full flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card text-foreground shadow-2xl outline-none",
  "fullscreen-mobile":
    "relative flex w-full flex-col overflow-hidden border-t border-border bg-card text-foreground shadow-2xl outline-none max-md:h-dvh max-md:rounded-none md:rounded-2xl md:border",
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
          "ui-modal-overlay fixed inset-0 isolate z-50 flex bg-black/40 text-left backdrop-blur-sm",
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
              isExiting ? "ui-modal-panel-exit" : "ui-modal-panel-enter",
              modalClassName,
            )
          }
        >
          <Dialog
            role={role}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={cn("flex max-h-[inherit] flex-col outline-none", dialogClassName)}
          >
            {children}
          </Dialog>
        </AriaModal>
      </div>
    </ModalOverlay>
  );
}
