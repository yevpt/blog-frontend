import type { ReactNode } from "react";
import type {
  TooltipProps as AriaTooltipProps,
  TooltipTriggerComponentProps as AriaTooltipTriggerComponentProps,
} from "react-aria-components";

/** `Tooltip` 的 props。 */
export interface TooltipProps
  extends AriaTooltipTriggerComponentProps, Omit<AriaTooltipProps, "children"> {
  title: ReactNode;
  description?: ReactNode;
  arrow?: boolean;
  delay?: number;
}
