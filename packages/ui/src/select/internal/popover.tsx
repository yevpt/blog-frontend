"use client";

import type { RefAttributes } from "react";
import type { PopoverProps as AriaPopoverProps } from "react-aria-components";
import { Popover as AriaPopover } from "react-aria-components";
import { cn } from "../../lib/utils";
import type { SelectSize } from "../types";

interface PopoverProps extends AriaPopoverProps, RefAttributes<HTMLElement> {
  size: SelectSize;
}

/** 选项浮层容器，宽度对齐触发器并带进出场动画。 */
export const Popover = (props: PopoverProps) => (
  <AriaPopover
    placement="bottom"
    containerPadding={0}
    offset={4}
    {...props}
    className={(state) =>
      cn(
        "w-(--trigger-width) overflow-x-hidden overflow-y-auto rounded-lg bg-card py-1 shadow-lg ring-1 ring-border outline-hidden will-change-transform",
        state.isEntering &&
          "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
        state.isExiting &&
          "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
        props.size === "sm" && "max-h-56",
        props.size === "md" && "max-h-64",
        props.size === "lg" && "max-h-80",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  />
);
