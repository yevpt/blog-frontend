"use client";

import { Menu as AriaMenu } from "react-aria-components";
import { cn } from "../../lib/utils";
import type { DropdownMenuProps } from "../types";

/** 菜单列表容器。 */
export const DropdownMenu = <T extends object>(props: DropdownMenuProps<T>) => (
  <AriaMenu
    {...props}
    className={(state) =>
      cn(
        "h-min overflow-y-auto py-1 outline-hidden select-none",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  />
);
