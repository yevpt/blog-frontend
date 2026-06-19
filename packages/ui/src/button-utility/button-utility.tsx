"use client";

import { isValidElement } from "react";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { Tooltip } from "../tooltip/tooltip";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";
import type { ButtonUtilityButtonProps, ButtonUtilityProps } from "./types";

const colorStyles = {
  secondary:
    "bg-card text-muted-foreground shadow-xs ring-1 ring-input ring-inset hover:bg-accent hover:text-foreground disabled:shadow-xs",
  tertiary: "text-muted-foreground hover:bg-accent hover:text-foreground",
};

export const ButtonUtility = ({
  tooltip,
  className,
  isDisabled,
  icon: Icon,
  size = "sm",
  color = "secondary",
  tooltipPlacement = "top",
  ...otherProps
}: ButtonUtilityProps) => {
  const href = "href" in otherProps ? otherProps.href : undefined;
  const Component = href ? AriaLink : AriaButton;

  const props = href
    ? {
        ...otherProps,
        href: isDisabled ? undefined : href,
        ...(isDisabled ? { "data-rac": true, "data-disabled": true } : {}),
      }
    : {
        ...otherProps,
        type: (otherProps as ButtonUtilityButtonProps).type || "button",
        isDisabled,
      };

  const content = (
    <Component
      aria-label={tooltip}
      {...(props as object)}
      className={cn(
        "group relative inline-flex h-max cursor-pointer items-center justify-center rounded-md p-1.5 outline-none transition duration-100 ease-linear focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        colorStyles[color],
        size === "xs" ? "*:size-4" : "*:size-5",
        className,
      )}
    >
      {isReactComponent(Icon) && <Icon />}
      {isValidElement(Icon) && Icon}
    </Component>
  );

  if (tooltip) {
    return (
      <Tooltip
        title={tooltip}
        placement={tooltipPlacement}
        isDisabled={isDisabled}
        offset={size === "xs" ? 4 : 6}
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};
