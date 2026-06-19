"use client";

import {
  Header as AriaHeader,
  MenuSection as AriaMenuSection,
  MenuTrigger as AriaMenuTrigger,
} from "react-aria-components";
import { DropdownDotsButton } from "./internal/dots-button";
import { DropdownItem } from "./internal/item";
import { DropdownKeyboard } from "./internal/keyboard";
import { DropdownMenu } from "./internal/menu";
import { DropdownPopover } from "./internal/popover";
import { DropdownSeparator } from "./internal/separator";
import { DropdownSubmenuTrigger } from "./internal/submenu-trigger";

/** 复合下拉菜单组件，通过命名空间属性组合各部分。 */
export const Dropdown = {
  Root: AriaMenuTrigger,
  Popover: DropdownPopover,
  Menu: DropdownMenu,
  Section: AriaMenuSection,
  SectionHeader: AriaHeader,
  Item: DropdownItem,
  Separator: DropdownSeparator,
  SubmenuTrigger: DropdownSubmenuTrigger,
  Keyboard: DropdownKeyboard,
  DotsButton: DropdownDotsButton,
};
