"use client";

import { Label as AriaLabel } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Tooltip, TooltipTrigger } from "../tooltip/tooltip";
import { cn } from "../lib/utils";
import type { LabelProps } from "./types";

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
      <span aria-hidden="true" className={cn("text-primary", isInvalid && "text-destructive")}>
        *
      </span>
    )}
    {tooltip && (
      <Tooltip title={tooltip} description={tooltipDescription} placement="top">
        <TooltipTrigger
          isDisabled={false}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <SvgIcon name="help-circle" size={16} />
        </TooltipTrigger>
      </Tooltip>
    )}
  </AriaLabel>
);

Label.displayName = "Label";
