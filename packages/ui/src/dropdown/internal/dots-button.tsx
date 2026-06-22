"use client";

import type { RefAttributes } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import type { IconName } from "@repo/icons";
import { SvgIcon } from "@repo/icons";
import { cn } from "../../lib/utils";

export interface DropdownDotsButtonProps extends AriaButtonProps, RefAttributes<HTMLButtonElement> {
  /**
   * 视觉变体：
   * - `minimal`：无背景色，hover 时仅文字变色（默认）
   * - `ghost`：圆形 hover 背景（`bg-accent`），菜单打开时保持高亮
   */
  variant?: "minimal" | "ghost";
  /** 三点图标方向，默认 `dots-vertical`。 */
  icon?: IconName;
}

/** 「⋮ / ⋯」触发按钮，默认带可访问 label。 */
export const DropdownDotsButton = ({
  variant = "minimal",
  icon = "dots-vertical",
  ...props
}: DropdownDotsButtonProps) => (
  <AriaButton
    {...props}
    aria-label={props["aria-label"] ?? "Open menu"}
    className={(state) =>
      cn(
        "inline-flex cursor-pointer items-center justify-center outline-none transition duration-100 ease-linear",
        variant === "ghost"
          ? [
              "rounded-full text-muted-foreground",
              "hover:bg-accent hover:text-accent-foreground",
              // 菜单打开时 MenuTrigger 会给按钮加 aria-expanded，借此保持高亮
              "aria-expanded:bg-accent aria-expanded:text-accent-foreground",
              state.isPressed && "bg-accent text-accent-foreground",
            ]
          : [
              "rounded-md text-muted-foreground",
              (state.isPressed || state.isHovered) && "text-foreground",
            ],
        // 仅键盘聚焦时显示焦点环；isPressed 在菜单打开期间会持续为 true，不能用来触发 ring
        state.isFocusVisible && "ring-2 ring-ring ring-offset-2",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  >
    <SvgIcon name={icon} size={20} />
  </AriaButton>
);
