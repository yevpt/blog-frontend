"use client";

import { isValidElement, useContext } from "react";
import type { ListBoxItemProps as AriaListBoxItemProps } from "react-aria-components";
import { ListBoxItem as AriaListBoxItem, Text as AriaText } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../avatar/avatar";
import { CheckboxBase } from "../checkbox/checkbox";
import { cn } from "../lib/utils";
import { isReactComponent } from "../lib/is-react-component";
import type { SelectItemType } from "./select-shared";
import { SelectContext } from "./select-shared";

const itemSizes = {
  sm: {
    root: "p-2 pr-2.5 gap-2",
    text: "text-sm",
    textContainer: "gap-x-1.5",
    checkSize: 16 as const,
    checkboxSize: "sm" as const,
  },
  md: {
    root: "p-2 pr-2.5 gap-2",
    text: "text-base",
    textContainer: "gap-x-2",
    checkSize: 20 as const,
    checkboxSize: "sm" as const,
  },
  lg: {
    root: "p-2.5 pl-2 gap-2",
    text: "text-base",
    textContainer: "gap-x-2",
    checkSize: 20 as const,
    checkboxSize: "md" as const,
  },
};

interface SelectItemProps extends Omit<AriaListBoxItemProps<SelectItemType>, "id">, SelectItemType {
  selectionIndicator?: "checkmark" | "checkbox" | "none";
  selectionIndicatorAlign?: "left" | "right";
}

export const SelectItem = ({
  label,
  id,
  value,
  avatarUrl,
  supportingText,
  isDisabled,
  icon: Icon,
  className,
  children,
  selectionIndicator = "checkmark",
  selectionIndicatorAlign = "right",
  ...props
}: SelectItemProps) => {
  const { size } = useContext(SelectContext);
  const s = itemSizes[size];

  const labelOrChildren = label || (typeof children === "string" ? children : "");
  const textValue = supportingText ? `${labelOrChildren} ${supportingText}` : labelOrChildren;
  const isLeft = selectionIndicatorAlign === "left";

  return (
    <AriaListBoxItem
      id={id}
      value={
        value ?? {
          id,
          label: labelOrChildren,
          avatarUrl,
          supportingText,
          isDisabled,
          icon: Icon,
        }
      }
      textValue={textValue}
      isDisabled={isDisabled}
      {...props}
      className={(state) =>
        cn(
          "w-full py-px outline-hidden",
          size === "sm" ? "px-1" : "px-1.5",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {(state) => (
        <div
          className={cn(
            "flex cursor-pointer items-center rounded-md outline-hidden select-none",
            (state.isFocused ||
              state.isHovered ||
              (state.isSelected && selectionIndicator !== "checkbox")) &&
              "bg-gray-50",
            state.isDisabled && "cursor-not-allowed opacity-50",
            state.isFocusVisible && "ring-2 ring-blue-500 ring-inset",
            s.root,
          )}
        >
          {isLeft && selectionIndicator === "checkbox" && (
            <CheckboxBase
              size={s.checkboxSize}
              isSelected={state.isSelected}
              isDisabled={state.isDisabled}
            />
          )}

          {avatarUrl ? (
            <Avatar aria-hidden="true" size="xs" src={avatarUrl} alt={label} />
          ) : isReactComponent(Icon) ? (
            <Icon aria-hidden="true" />
          ) : isValidElement(Icon) ? (
            Icon
          ) : null}

          <div className={cn("flex w-full min-w-0 flex-1 flex-wrap", s.textContainer)}>
            <AriaText
              slot="label"
              className={cn("truncate font-medium whitespace-nowrap text-gray-900", s.text)}
            >
              {label || (typeof children === "function" ? children(state) : children)}
            </AriaText>
            {supportingText && (
              <AriaText
                slot="description"
                className={cn("whitespace-nowrap text-gray-500", s.text)}
              >
                {supportingText}
              </AriaText>
            )}
          </div>

          {state.isSelected && selectionIndicator === "checkmark" && (
            <span className="ml-auto text-blue-600">
              <SvgIcon name="check" size={s.checkSize} />
            </span>
          )}

          {!isLeft && selectionIndicator === "checkbox" && (
            <CheckboxBase
              size={s.checkboxSize}
              isSelected={state.isSelected}
              isDisabled={state.isDisabled}
              className="ml-auto"
            />
          )}
        </div>
      )}
    </AriaListBoxItem>
  );
};
