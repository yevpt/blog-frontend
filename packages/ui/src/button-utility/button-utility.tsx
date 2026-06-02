"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  FC,
  ReactNode,
} from "react";
import { isValidElement } from "react";
import type {
  ButtonProps as AriaButtonProps,
  LinkProps as AriaLinkProps,
  Placement,
} from "react-aria-components";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { Tooltip } from "../tooltip/tooltip";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";

const colorStyles = {
  secondary:
    "bg-white text-gray-500 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 hover:text-gray-600 disabled:shadow-xs",
  tertiary: "text-gray-500 hover:bg-gray-100 hover:text-gray-600",
};

export interface CommonProps {
  isDisabled?: boolean;
  size?: "xs" | "sm";
  color?: "secondary" | "tertiary";
  icon?: FC<{ className?: string }> | ReactNode;
  tooltip?: string;
  tooltipPlacement?: Placement;
}

export interface ButtonUtilityButtonProps
  extends
    CommonProps,
    DetailedHTMLProps<
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "slot">,
      HTMLButtonElement
    > {
  slot?: AriaButtonProps["slot"];
  href?: never;
}

interface ButtonUtilityLinkProps
  extends
    CommonProps,
    DetailedHTMLProps<Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "color">, HTMLAnchorElement> {
  routerOptions?: AriaLinkProps["routerOptions"];
  href: string;
}

export type ButtonUtilityProps = ButtonUtilityButtonProps | ButtonUtilityLinkProps;

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
        "group relative inline-flex h-max cursor-pointer items-center justify-center rounded-md p-1.5 outline-none transition duration-100 ease-linear focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
