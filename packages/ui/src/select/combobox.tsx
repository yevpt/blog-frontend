"use client";

import type {
  FC,
  FocusEventHandler,
  PointerEventHandler,
  ReactNode,
  Ref,
  RefAttributes,
} from "react";
import { isValidElement, useCallback, useContext, useRef, useState } from "react";
import type {
  ComboBoxProps as AriaComboBoxProps,
  ListBoxProps as AriaListBoxProps,
} from "react-aria-components";
import {
  ComboBox as AriaComboBox,
  Group as AriaGroup,
  Input as AriaInput,
  ListBox as AriaListBox,
  ComboBoxStateContext,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { HintText } from "../input/hint-text";
import { Label } from "../input/label";
import { Popover } from "./popover";
import { type CommonProps, SelectContext, type SelectItemType, sizes } from "./select-shared";
import { useResizeObserver } from "../lib/use-resize-observer";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";

interface ComboBoxProps
  extends
    Omit<AriaComboBoxProps<SelectItemType>, "children" | "items">,
    RefAttributes<HTMLDivElement>,
    CommonProps {
  shortcut?: boolean;
  items?: SelectItemType[];
  popoverClassName?: string;
  shortcutClassName?: string;
  icon?: FC | ReactNode;
  children: AriaListBoxProps<SelectItemType>["children"];
}

interface ComboBoxValueProps {
  size: "sm" | "md" | "lg";
  shortcut?: boolean;
  placeholder?: string;
  shortcutClassName?: string;
  icon?: FC | ReactNode;
  onFocus?: FocusEventHandler;
  onPointerEnter?: PointerEventHandler;
  ref?: Ref<HTMLDivElement>;
}

const ComboBoxValue = ({
  size,
  placeholder,
  shortcut: _shortcut,
  shortcutClassName: _shortcutClassName,
  icon: IconProp,
  ref,
  ...otherProps
}: ComboBoxValueProps) => {
  useContext(ComboBoxStateContext);

  return (
    <AriaGroup
      ref={ref}
      {...otherProps}
      className={({ isFocusWithin, isDisabled }) =>
        cn(
          "relative flex w-full items-center gap-2 rounded-lg bg-white shadow-xs ring-1 ring-gray-300 outline-hidden transition-shadow duration-100 ease-linear ring-inset",
          isDisabled && "cursor-not-allowed opacity-50",
          isFocusWithin && "ring-2 ring-blue-500",
          sizes[size].root,
        )
      }
    >
      {isReactComponent(IconProp) ? (
        <IconProp aria-hidden="true" />
      ) : isValidElement(IconProp) ? (
        IconProp
      ) : (
        <span className="text-gray-400">
          <SvgIcon name="search" size={size === "lg" ? 20 : 16} />
        </span>
      )}
      <AriaInput
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none",
          sizes[size].text,
        )}
      />
    </AriaGroup>
  );
};

export const ComboBox = ({
  placeholder = "Search",
  shortcut = true,
  size = "md",
  children,
  items,
  shortcutClassName,
  icon,
  hideRequiredIndicator,
  ...otherProps
}: ComboBoxProps) => {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [popoverWidth, setPopoverWidth] = useState("");

  const onResize = useCallback(() => {
    if (!placeholderRef.current) return;
    setPopoverWidth(placeholderRef.current.getBoundingClientRect().width + "px");
  }, []);

  useResizeObserver({ ref: placeholderRef, box: "border-box", onResize });

  return (
    <SelectContext.Provider value={{ size }}>
      <AriaComboBox menuTrigger="focus" {...otherProps}>
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
              ref={placeholderRef}
              placeholder={placeholder}
              shortcut={shortcut}
              shortcutClassName={shortcutClassName}
              icon={icon}
              size={size}
              onFocus={onResize}
              onPointerEnter={onResize}
            />

            <Popover
              size={size}
              triggerRef={placeholderRef}
              style={{ width: popoverWidth }}
              className={otherProps.popoverClassName}
            >
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
