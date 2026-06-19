"use client";

import { ListBox as AriaListBox, Select as AriaSelect } from "react-aria-components";
import { HintText } from "../input/hint-text";
import { Label } from "../input/label";
import { cn } from "../lib/utils";
import { SelectContext } from "./context";
import { ComboBox } from "./internal/combobox";
import { Popover } from "./internal/popover";
import { SelectItem } from "./internal/select-item";
import { SelectValue } from "./internal/select-value";
import type { SelectProps } from "./types";

const SelectRoot = ({
  placeholder = "Select",
  icon,
  size = "md",
  children,
  items,
  label,
  hint,
  tooltip,
  hideRequiredIndicator,
  className,
  ...rest
}: SelectProps) => (
  <SelectContext.Provider value={{ size }}>
    <AriaSelect
      {...rest}
      className={(state) =>
        cn("flex flex-col gap-1.5", typeof className === "function" ? className(state) : className)
      }
    >
      {(state) => (
        <>
          {label && (
            <Label isRequired={hideRequiredIndicator ? false : state.isRequired} tooltip={tooltip}>
              {label}
            </Label>
          )}

          <SelectValue {...state} {...{ size, placeholder }} icon={icon} />

          <Popover size={size} className={rest.popoverClassName}>
            <AriaListBox items={items} className="size-full outline-hidden">
              {children}
            </AriaListBox>
          </Popover>

          {hint && (
            <HintText isInvalid={state.isInvalid} className={size === "sm" ? "text-xs" : undefined}>
              {hint}
            </HintText>
          )}
        </>
      )}
    </AriaSelect>
  </SelectContext.Provider>
);

/** 复合选择器：根组件挂载 `.ComboBox` 与 `.Item` 子部件。 */
export const Select = SelectRoot as typeof SelectRoot & {
  ComboBox: typeof ComboBox;
  Item: typeof SelectItem;
};
Select.ComboBox = ComboBox;
Select.Item = SelectItem;
