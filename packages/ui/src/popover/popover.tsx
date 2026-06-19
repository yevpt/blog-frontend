"use client";

import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  OverlayArrow as AriaOverlayArrow,
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
  type PopoverRenderProps,
} from "react-aria-components";
import { cn } from "../lib/utils";
import type { PopoverProps } from "./types";

/** 触发器与 Popover 的组合容器，提供受控/非受控开合与定位。 */
export const PopoverTrigger = AriaDialogTrigger;

/** 浮层内的对话框容器，为含可聚焦内容的浮层提供焦点管理。 */
export const PopoverDialog = AriaDialog;

/** 将 render-props 形态的 className 归一为字符串。 */
const resolveClassName = (
  className: AriaPopoverProps["className"],
  state: PopoverRenderProps & { defaultClassName: string | undefined },
): string | undefined => (typeof className === "function" ? className(state) : className);

/**
 * 相对触发元素定位的浮层，基于 React Aria `Popover` 封装。
 * 默认带进出场动画，可选箭头；置于 `PopoverTrigger` 内或通过 `triggerRef`/`isOpen` 独立使用。
 */
export const Popover = ({
  children,
  showArrow = false,
  className,
  classNames,
  offset,
  ...popoverProps
}: PopoverProps) => (
  <AriaPopover
    {...popoverProps}
    offset={offset ?? (showArrow ? 12 : 8)}
    className={(state) =>
      cn(
        "z-50 rounded-lg bg-card text-foreground shadow-lg ring-1 ring-border outline-hidden",
        state.isEntering &&
          "duration-150 ease-out animate-in fade-in zoom-in-95 placement-bottom:slide-in-from-top-0.5 placement-top:slide-in-from-bottom-0.5 placement-left:slide-in-from-right-0.5 placement-right:slide-in-from-left-0.5",
        state.isExiting &&
          "duration-100 ease-in animate-out fade-out zoom-out-95 placement-bottom:slide-out-to-top-0.5 placement-top:slide-out-to-bottom-0.5 placement-left:slide-out-to-right-0.5 placement-right:slide-out-to-left-0.5",
        resolveClassName(className, state),
        resolveClassName(classNames?.popover, state),
      )
    }
  >
    {showArrow && (
      <AriaOverlayArrow className={cn("group", classNames?.arrow)}>
        <svg
          viewBox="0 0 12 12"
          className="block size-3 fill-card stroke-border stroke-1 group-placement-bottom:rotate-180 group-placement-left:-rotate-90 group-placement-right:rotate-90"
        >
          <path d="M0 0 L6 6 L12 0" />
        </svg>
      </AriaOverlayArrow>
    )}
    {children}
  </AriaPopover>
);
