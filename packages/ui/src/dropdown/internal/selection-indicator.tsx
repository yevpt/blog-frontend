"use client";

import type { MenuItemRenderProps } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { CheckboxBase } from "../../checkbox/checkbox";
import { RadioButtonBase } from "../../radio-buttons/radio-buttons";
import { ToggleBase } from "../../toggle/toggle";
import { cn } from "../../lib/utils";
import type { DropdownSelectionIndicator } from "../types";

type SelectionIndicatorProps = MenuItemRenderProps & {
  variant: DropdownSelectionIndicator;
  className?: string;
};

/** 按 variant 渲染菜单项的选中态指示器。 */
export const SelectionIndicator = ({ variant, className, ...state }: SelectionIndicatorProps) => {
  if (variant === "checkmark") {
    return (
      <span className={cn("shrink-0", !state.isSelected && "invisible", className)}>
        <SvgIcon name="check" size={16} />
      </span>
    );
  }
  if (variant === "checkbox") {
    return (
      <CheckboxBase
        isSelected={state.isSelected && !state.hasSubmenu}
        isIndeterminate={state.isSelected && state.hasSubmenu}
        size="sm"
        className={cn("shrink-0", className)}
      />
    );
  }
  if (variant === "radio") {
    return <RadioButtonBase isSelected={state.isSelected} className={cn("shrink-0", className)} />;
  }
  if (variant === "toggle") {
    return (
      <ToggleBase
        slim
        size="sm"
        isSelected={state.isSelected}
        className={cn("shrink-0", className)}
      />
    );
  }
  return null;
};
