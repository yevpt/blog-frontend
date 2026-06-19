"use client";

import type { RefAttributes } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { cn } from "../../lib/utils";

/** 「⋮」触发按钮，默认带可访问 label。 */
export const DropdownDotsButton = (props: AriaButtonProps & RefAttributes<HTMLButtonElement>) => (
  <AriaButton
    {...props}
    aria-label={props["aria-label"] ?? "Open menu"}
    className={(state) =>
      cn(
        "cursor-pointer rounded-md text-muted-foreground outline-none transition duration-100 ease-linear",
        (state.isPressed || state.isHovered) && "text-foreground",
        (state.isPressed || state.isFocusVisible) && "ring-2 ring-ring ring-offset-2",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  >
    <SvgIcon name="dots-vertical" size={20} />
  </AriaButton>
);
