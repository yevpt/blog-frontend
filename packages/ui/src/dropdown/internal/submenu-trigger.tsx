"use client";

import { Children, type ReactElement } from "react";
import { SubmenuTrigger as AriaSubmenuTrigger } from "react-aria-components";
import type { DropdownSubmenuTriggerProps } from "../types";
import { DropdownPopover } from "./popover";

/**
 * 子菜单触发器。
 * children 必须为两个元素：`[触发项 Item, 子菜单 Menu]`，子菜单会被自动包进 Popover。
 */
export const DropdownSubmenuTrigger = ({
  children,
  popoverProps,
  ...props
}: DropdownSubmenuTriggerProps) => {
  const [trigger, menu] = Children.toArray(children) as [ReactElement, ReactElement];

  return (
    <AriaSubmenuTrigger {...props}>
      {trigger}
      {/* 子菜单浮层贴着触发项右上展开，负 offset 让它与父项视觉对齐。 */}
      <DropdownPopover placement="end top" offset={-2} crossOffset={-4} {...popoverProps}>
        {menu}
      </DropdownPopover>
    </AriaSubmenuTrigger>
  );
};
