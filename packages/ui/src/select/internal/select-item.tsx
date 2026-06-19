"use client";

import { isValidElement, useContext } from "react";
import { ListBoxItem as AriaListBoxItem, Text as AriaText } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../../avatar/avatar";
import { CheckboxBase } from "../../checkbox/checkbox";
import { cn } from "../../lib/utils";
import { isReactComponent } from "../../lib/is-react-component";
import { SelectContext } from "../context";
import type { SelectItemProps } from "../types";
import { itemSizes } from "../utils/sizes";

/** 单个列表项，支持头像/图标、勾选或复选框两种选中态指示器。 */
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
              "bg-accent",
            state.isDisabled && "cursor-not-allowed opacity-50",
            state.isFocusVisible && "ring-2 ring-ring ring-inset",
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
              className={cn("truncate font-medium whitespace-nowrap text-foreground", s.text)}
            >
              {label || (typeof children === "function" ? children(state) : children)}
            </AriaText>
            {supportingText && (
              <AriaText
                slot="description"
                className={cn("whitespace-nowrap text-muted-foreground", s.text)}
              >
                {supportingText}
              </AriaText>
            )}
          </div>

          {state.isSelected && selectionIndicator === "checkmark" && (
            <span className="ml-auto text-primary">
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
