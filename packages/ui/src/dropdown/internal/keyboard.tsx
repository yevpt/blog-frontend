"use client";

import type { ComponentProps } from "react";
import { Keyboard as AriaKeyboard } from "react-aria-components";
import { cn } from "../../lib/utils";

/** 行尾快捷键展示（语义 `<kbd>`），用于在自定义 children 组合中标注快捷键。 */
export const DropdownKeyboard = ({ className, ...props }: ComponentProps<typeof AriaKeyboard>) => (
  <AriaKeyboard
    {...props}
    className={cn(
      "ml-auto pl-3 text-xs font-medium tracking-widest text-muted-foreground",
      className,
    )}
  />
);
