import type { ReactNode } from "react";
import type {
  PopoverProps as AriaPopoverProps,
  PopoverRenderProps as AriaPopoverRenderProps,
} from "react-aria-components";

/** `Popover` 关键节点的 className slot 定制。 */
export interface PopoverClassNames {
  /** 浮层 root（亦可用顶层 `className` 设置）。 */
  popover?: AriaPopoverProps["className"];
  /** 指向触发元素的箭头容器。 */
  arrow?: string;
}

/** `Popover` 的 props。 */
export interface PopoverProps extends Omit<AriaPopoverProps, "children" | "className"> {
  children: ReactNode;
  /** 是否显示指向触发元素的箭头，默认 false。 */
  showArrow?: boolean;
  /** 作用在浮层 root 的 className，可为基于状态的 render-props 函数。 */
  className?: AriaPopoverProps["className"];
  /** 关键节点的 className slot 定制。 */
  classNames?: PopoverClassNames;
}

export type { AriaPopoverRenderProps as PopoverRenderProps };
