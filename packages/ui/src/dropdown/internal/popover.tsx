"use client";

import { Popover as AriaPopover } from "react-aria-components";
import { cn } from "../../lib/utils";
import { popoverVariantClasses } from "../../lib/control-variants";
import type { DropdownPopoverProps } from "../types";

const compactMotion = popoverVariantClasses.compact;

/** 浮层容器，默认右下对齐并带进出场动画。 */
export const DropdownPopover = (props: DropdownPopoverProps) => (
  <AriaPopover
    placement="bottom right"
    {...props}
    className={(state) =>
      cn(
        "w-56 overflow-auto rounded-lg bg-card shadow-lg ring-1 ring-border outline-hidden will-change-transform",
        state.isEntering && compactMotion.entering,
        state.isExiting && compactMotion.exiting,
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  >
    {props.children}
  </AriaPopover>
);
