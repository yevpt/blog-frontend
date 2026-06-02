"use client";

import type { ReactNode, Ref } from "react";
import type { TextProps as AriaTextProps } from "react-aria-components";
import { Text as AriaText } from "react-aria-components";
import { cn } from "../lib/utils";

interface HintTextProps extends AriaTextProps {
  isInvalid?: boolean;
  ref?: Ref<HTMLElement>;
  size?: "sm" | "md";
  children: ReactNode;
}

export const HintText = ({ isInvalid, className, size = "md", ...props }: HintTextProps) => (
  <AriaText
    {...props}
    slot={isInvalid ? "errorMessage" : "description"}
    className={cn(
      "text-sm text-gray-500",
      size === "sm" && "text-xs",
      isInvalid && "text-red-600",
      "group-invalid:text-red-600",
      className,
    )}
  />
);

HintText.displayName = "HintText";
