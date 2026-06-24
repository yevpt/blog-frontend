"use client";

import type { FC, ReactNode, Ref } from "react";
import { isValidElement, useContext } from "react";
import { Button as AriaButton, SelectValue as AriaSelectValue } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../../avatar/avatar";
import { cn } from "../../lib/utils";
import { isReactComponent } from "../../lib/is-react-component";
import { SelectContext } from "../context";
import type { SelectItemType, SelectSize } from "../types";
import { minimalTriggerSizes, triggerSizes } from "../utils/sizes";
import { chevronClasses, triggerVariantClasses } from "../utils/variants";

interface SelectValueProps {
  isOpen: boolean;
  size: SelectSize;
  isFocused: boolean;
  isDisabled: boolean;
  placeholder?: string;
  ref?: Ref<HTMLButtonElement>;
  icon?: FC | ReactNode;
}

/** Select 触发按钮，展示当前选中项或 placeholder。 */
export const SelectValue = ({
  isOpen,
  isFocused,
  isDisabled,
  size,
  placeholder,
  icon,
  ref,
}: SelectValueProps) => {
  const { variant } = useContext(SelectContext);
  const variantStyle = triggerVariantClasses[variant];
  const isMinimal = variant === "minimal";
  const isActive = !isMinimal && (isFocused || isOpen);
  const sizes = isMinimal ? minimalTriggerSizes : triggerSizes;
  const chevronSize = isMinimal ? 8 : size === "lg" ? 20 : 16;

  return (
    <AriaButton
      ref={ref}
      className={cn(
        "relative flex cursor-pointer items-center outline-hidden",
        !isMinimal && "w-full",
        variantStyle.base,
        isActive && variantStyle.active,
        isDisabled && "cursor-not-allowed opacity-50",
      )}
    >
      <AriaSelectValue<SelectItemType>
        className={(_state) =>
          cn(
            isMinimal
              ? "flex h-auto w-auto items-center justify-end"
              : "flex h-max w-full items-center justify-start truncate text-left align-middle",
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
                <section
                  className={cn(
                    isMinimal ? "flex w-auto shrink-0" : "flex w-full truncate",
                    sizes[size].textContainer,
                  )}
                >
                  <p
                    className={cn(
                      "truncate font-medium",
                      isMinimal ? "font-mono text-muted-foreground" : "text-foreground",
                      sizes[size].text,
                    )}
                  >
                    {selectedItem.label}
                  </p>
                  {selectedItem.supportingText && (
                    <p className={cn("text-muted-foreground", sizes[size].text)}>
                      {selectedItem.supportingText}
                    </p>
                  )}
                </section>
              ) : (
                <p className={cn("text-muted-foreground", sizes[size].text)}>{placeholder}</p>
              )}

              <span
                className={cn(
                  isMinimal
                    ? "shrink-0 text-muted-foreground"
                    : "ml-auto shrink-0 text-muted-foreground",
                  chevronClasses,
                )}
                data-open={isOpen ? "true" : "false"}
              >
                <SvgIcon name="chevron-down" size={chevronSize} />
              </span>
            </>
          );
        }}
      </AriaSelectValue>
    </AriaButton>
  );
};
