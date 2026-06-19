"use client";

import { Popover as AriaPopover } from "react-aria-components";
import { cn } from "../../lib/utils";
import type { DropdownPopoverProps } from "../types";

/** 浮层容器，默认右下对齐并带进出场动画。 */
export const DropdownPopover = (props: DropdownPopoverProps) => (
  <AriaPopover
    placement="bottom right"
    {...props}
    className={(state) =>
      cn(
        "w-56 overflow-auto rounded-lg bg-card shadow-lg ring-1 ring-border",
        state.isEntering &&
          "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
        state.isExiting &&
          "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  >
    {props.children}
  </AriaPopover>
);
