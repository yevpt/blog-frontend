"use client";

import type { RefAttributes } from "react";
import { useContext } from "react";
import type { PopoverProps as AriaPopoverProps } from "react-aria-components";
import { Popover as AriaPopover } from "react-aria-components";
import { cn } from "../../lib/utils";
import { SelectContext } from "../context";
import type { SelectSize } from "../types";
import { getSelectPopoverMotion } from "../utils/variants";

interface PopoverProps extends AriaPopoverProps, RefAttributes<HTMLElement> {
  size: SelectSize;
}

/** 选项浮层容器，宽度对齐触发器并带进出场动画。 */
export const Popover = (props: PopoverProps) => {
  const { variant } = useContext(SelectContext);
  const motion = getSelectPopoverMotion(variant);

  return (
    <AriaPopover
      placement="bottom"
      containerPadding={0}
      offset={4}
      {...props}
      className={(state) =>
        cn(
          "w-(--trigger-width) overflow-x-hidden overflow-y-auto rounded-lg bg-card py-1 shadow-lg ring-1 ring-border outline-hidden will-change-transform",
          state.isEntering && motion.entering,
          state.isExiting && motion.exiting,
          props.size === "sm" && "max-h-56",
          props.size === "md" && "max-h-64",
          props.size === "lg" && "max-h-80",
          typeof props.className === "function" ? props.className(state) : props.className,
        )
      }
    />
  );
};
