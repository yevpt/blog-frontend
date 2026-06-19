"use client";

import { Separator as AriaSeparator } from "react-aria-components";
import { cn } from "../../lib/utils";
import type { DropdownSeparatorProps } from "../types";

/** 菜单分隔线。 */
export const DropdownSeparator = (props: DropdownSeparatorProps) => (
  <AriaSeparator {...props} className={cn("my-1 h-px w-full bg-border", props.className)} />
);
