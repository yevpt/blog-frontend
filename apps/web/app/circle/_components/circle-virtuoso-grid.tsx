"use client";

import { memo, forwardRef } from "react";
import { cn } from "@repo/ui";
import {
  CIRCLE_GRID_ITEM_CLASS,
  CIRCLE_GRID_LIST_CLASS,
  CIRCLE_GRID_LIST_STYLE,
} from "./circle-grid";

/** VirtuosoGrid List：必须保留 props.style 中的 paddingTop/Bottom，否则虚拟滚动整屏抖动 */
export const CircleVirtuosoList = memo(
  forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ style, className, ...props }, ref) => (
      <div
        {...props}
        ref={ref}
        className={cn(CIRCLE_GRID_LIST_CLASS, className)}
        style={{ ...style, ...CIRCLE_GRID_LIST_STYLE }}
      />
    ),
  ),
);
CircleVirtuosoList.displayName = "CircleVirtuosoList";

/** VirtuosoGrid Item：宽度由 Grid 轨道决定 */
export const CircleVirtuosoItem = memo(
  forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div {...props} ref={ref} className={cn(CIRCLE_GRID_ITEM_CLASS, className)} />
    ),
  ),
);
CircleVirtuosoItem.displayName = "CircleVirtuosoItem";

export const CIRCLE_VIRTUOSO_COMPONENTS = {
  List: CircleVirtuosoList,
  Item: CircleVirtuosoItem,
} as const;
