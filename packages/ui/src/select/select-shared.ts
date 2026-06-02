import type { FC, ReactNode } from "react";
import { createContext } from "react";

export type SelectItemType = {
  id: string | number;
  label?: string;
  avatarUrl?: string;
  isDisabled?: boolean;
  supportingText?: string;
  icon?: FC | ReactNode;
};

export interface CommonProps {
  hint?: string;
  label?: string;
  tooltip?: string;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  hideRequiredIndicator?: boolean;
}

export const sizes = {
  sm: { root: "py-2 pl-3 pr-2.5 gap-2", text: "text-sm", textContainer: "gap-x-1.5" },
  md: { root: "py-2 px-3 gap-2", text: "text-base", textContainer: "gap-x-1.5" },
  lg: { root: "py-2.5 px-3.5 gap-2", text: "text-base", textContainer: "gap-x-1.5" },
};

export const SelectContext = createContext<{ size: "sm" | "md" | "lg" }>({ size: "md" });
