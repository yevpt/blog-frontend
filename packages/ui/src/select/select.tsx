"use client";

import type { FC, ReactNode, Ref, RefAttributes } from "react";
import { isValidElement } from "react";
import type { SelectProps as AriaSelectProps } from "react-aria-components";
import {
  Button as AriaButton,
  ListBox as AriaListBox,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../avatar/avatar";
import { HintText } from "../input/hint-text";
import { Label } from "../input/label";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";
import { ComboBox } from "./combobox";
import { Popover } from "./popover";
import { SelectItem } from "./select-item";
import { type CommonProps, SelectContext, type SelectItemType, sizes } from "./select-shared";

export { SelectContext, sizes, type CommonProps, type SelectItemType } from "./select-shared";

export interface SelectProps
  extends
    Omit<AriaSelectProps<SelectItemType>, "children" | "items">,
    RefAttributes<HTMLDivElement>,
    CommonProps {
  items?: SelectItemType[];
  popoverClassName?: string;
  icon?: FC | ReactNode;
  children: ReactNode | ((item: SelectItemType) => ReactNode);
}

interface SelectValueProps {
  isOpen: boolean;
  size: "sm" | "md" | "lg";
  isFocused: boolean;
  isDisabled: boolean;
  placeholder?: string;
  ref?: Ref<HTMLButtonElement>;
  icon?: FC | ReactNode;
}

const SelectValue = ({
  isOpen,
  isFocused,
  isDisabled,
  size,
  placeholder,
  icon,
  ref,
}: SelectValueProps) => (
  <AriaButton
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer items-center rounded-lg bg-white shadow-xs ring-1 ring-gray-300 outline-hidden transition duration-100 ease-linear ring-inset",
      (isFocused || isOpen) && "ring-2 ring-blue-500",
      isDisabled && "cursor-not-allowed opacity-50",
    )}
  >
    <AriaSelectValue<SelectItemType>
      className={(_state) =>
        cn(
          "flex h-max w-full items-center justify-start truncate text-left align-middle",
          sizes[size].root,
        )
      }
    >
      {(state) => {
        const selectedItem = state.selectedItems[0];
        const Icon = selectedItem?.icon || icon;

        return (
          <>
            {selectedItem?.avatarUrl ? (
              <Avatar size="xs" src={selectedItem.avatarUrl} alt={selectedItem.label} />
            ) : isReactComponent(Icon) ? (
              <Icon aria-hidden="true" />
            ) : isValidElement(Icon) ? (
              Icon
            ) : null}

            {selectedItem ? (
              <section className={cn("flex w-full truncate", sizes[size].textContainer)}>
                <p className={cn("truncate font-medium text-gray-900", sizes[size].text)}>
                  {selectedItem.label}
                </p>
                {selectedItem.supportingText && (
                  <p className={cn("text-gray-500", sizes[size].text)}>
                    {selectedItem.supportingText}
                  </p>
                )}
              </section>
            ) : (
              <p className={cn("text-gray-400", sizes[size].text)}>{placeholder}</p>
            )}

            <span className="ml-auto shrink-0 text-gray-400">
              <SvgIcon name="chevron-down" size={size === "lg" ? 20 : 16} />
            </span>
          </>
        );
      }}
    </AriaSelectValue>
  </AriaButton>
);

const Select = ({
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

const _Select = Select as typeof Select & {
  ComboBox: typeof ComboBox;
  Item: typeof SelectItem;
};
_Select.ComboBox = ComboBox;
_Select.Item = SelectItem;

export { _Select as Select };
