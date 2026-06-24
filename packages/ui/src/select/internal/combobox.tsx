"use client";

import type { FC, ReactNode, Ref } from "react";
import { isValidElement } from "react";
import {
  ComboBox as AriaComboBox,
  Group as AriaGroup,
  Input as AriaInput,
  ListBox as AriaListBox,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { HintText } from "../../input/hint-text";
import { Label } from "../../input/label";
import { cn } from "../../lib/utils";
import { isReactComponent } from "../../lib/is-react-component";
import { SelectContext } from "../context";
import type { ComboBoxProps, SelectSize, SelectVariant } from "../types";
import { comboboxTriggerSizes } from "../utils/sizes";
import { chevronClasses, triggerVariantClasses } from "../utils/variants";
import { Popover } from "./popover";

interface ComboBoxValueProps {
  size: SelectSize;
  variant: SelectVariant;
  isOpen: boolean;
  placeholder?: string;
  icon?: FC | ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const ComboBoxValue = ({
  size,
  variant,
  isOpen,
  placeholder,
  icon: IconProp,
  ref,
  ...otherProps
}: ComboBoxValueProps) => {
  const resolvedVariant = variant === "minimal" ? "compact" : variant;
  const variantStyle = triggerVariantClasses[resolvedVariant];
  const chevronSize = size === "lg" ? 20 : 16;

  return (
    <AriaGroup
      ref={ref}
      {...otherProps}
      className={({ isFocusWithin, isDisabled }) =>
        cn(
          "relative flex w-full items-center outline-hidden",
          variantStyle.base,
          (isFocusWithin || isOpen) && variantStyle.active,
          isDisabled && "cursor-not-allowed opacity-50",
          comboboxTriggerSizes[size].root,
        )
      }
    >
      {isReactComponent(IconProp) ? (
        <span className="shrink-0 pl-3 text-muted-foreground">
          <IconProp aria-hidden="true" />
        </span>
      ) : isValidElement(IconProp) ? (
        <span className="shrink-0 pl-3 text-muted-foreground">{IconProp}</span>
      ) : (
        <span className="shrink-0 pl-3 text-muted-foreground">
          <SvgIcon name="search" size={chevronSize} />
        </span>
      )}
      <AriaInput
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-2 outline-none",
          "text-foreground placeholder:text-muted-foreground",
          comboboxTriggerSizes[size].input,
        )}
      />
      <span
        className={cn("shrink-0 pr-1.5 text-muted-foreground", chevronClasses)}
        data-open={isOpen ? "true" : "false"}
        aria-hidden="true"
      >
        <SvgIcon name="chevron-down" size={chevronSize} />
      </span>
    </AriaGroup>
  );
};

/** 可搜索下拉框：输入框 + 联想列表，浮层宽度与 Select 一致跟随触发器。 */
export const ComboBox = ({
  placeholder = "Search",
  shortcut: _shortcut = true,
  size = "md",
  variant = "compact",
  children,
  items,
  shortcutClassName: _shortcutClassName,
  icon,
  hideRequiredIndicator,
  ...otherProps
}: ComboBoxProps) => {
  return (
    <SelectContext.Provider value={{ size, variant: variant === "minimal" ? "compact" : variant }}>
      <AriaComboBox menuTrigger="input" {...otherProps} items={items}>
        {(state) => (
          <div className="flex flex-col gap-1.5">
            {otherProps.label && (
              <Label
                isRequired={hideRequiredIndicator ? false : state.isRequired}
                tooltip={otherProps.tooltip}
              >
                {otherProps.label}
              </Label>
            )}

            <ComboBoxValue
              placeholder={placeholder}
              icon={icon}
              size={size}
              variant={variant}
              isOpen={state.isOpen}
            />

            <Popover size={size} className={otherProps.popoverClassName}>
              <AriaListBox items={items} className="size-full outline-hidden">
                {children}
              </AriaListBox>
            </Popover>

            {otherProps.hint && (
              <HintText
                isInvalid={state.isInvalid}
                className={size === "sm" ? "text-xs" : undefined}
              >
                {otherProps.hint}
              </HintText>
            )}
          </div>
        )}
      </AriaComboBox>
    </SelectContext.Provider>
  );
};
