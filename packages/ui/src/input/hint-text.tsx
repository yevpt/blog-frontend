"use client";

import { Text as AriaText } from "react-aria-components";
import { cn } from "../lib/utils";
import type { HintTextProps } from "./types";

export const HintText = ({ isInvalid, className, size = "md", ...props }: HintTextProps) => (
  <AriaText
    {...props}
    slot={isInvalid ? "errorMessage" : "description"}
    className={cn(
      "text-sm text-muted-foreground",
      size === "sm" && "text-xs",
      isInvalid && "text-destructive",
      "group-invalid:text-destructive",
      className,
    )}
  />
);

HintText.displayName = "HintText";
