"use client";

import type { ReactNode, Ref } from "react";
import type { LabelProps as AriaLabelProps } from "react-aria-components";
import { Label as AriaLabel } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Tooltip, TooltipTrigger } from "../tooltip/tooltip";
import { cn } from "../lib/utils";

interface LabelProps extends AriaLabelProps {
  children: ReactNode;
  isInvalid?: boolean;
  isRequired?: boolean;
  tooltip?: string;
  tooltipDescription?: string;
  ref?: Ref<HTMLLabelElement>;
}

export const Label = ({
  isInvalid,
  isRequired,
  tooltip,
  tooltipDescription,
  className,
  ...props
}: LabelProps) => (
  <AriaLabel
    data-label="true"
    {...props}
    className={cn(
      "flex cursor-default items-center gap-0.5 text-xs font-semibold text-foreground/80",
      className,
    )}
  >
    {props.children}
    {isRequired && (
      <span aria-hidden="true" className={cn("text-blue-500", isInvalid && "text-red-500")}>
        *
      </span>
    )}
    {tooltip && (
      <Tooltip title={tooltip} description={tooltipDescription} placement="top">
        <TooltipTrigger
          isDisabled={false}
          className="cursor-pointer text-gray-400 hover:text-gray-500"
        >
          <SvgIcon name="help-circle" size={16} />
        </TooltipTrigger>
      </Tooltip>
    )}
  </AriaLabel>
);

Label.displayName = "Label";
