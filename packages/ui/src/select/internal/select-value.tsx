"use client";

import type { FC, ReactNode, Ref } from "react";
import { isValidElement } from "react";
import { Button as AriaButton, SelectValue as AriaSelectValue } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../../avatar/avatar";
import { cn } from "../../lib/utils";
import { isReactComponent } from "../../lib/is-react-component";
import type { SelectItemType, SelectSize } from "../types";
import { triggerSizes } from "../utils/sizes";

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
}: SelectValueProps) => (
  <AriaButton
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer items-center rounded-lg bg-card shadow-xs ring-1 ring-input outline-hidden transition duration-100 ease-linear ring-inset",
      (isFocused || isOpen) && "ring-2 ring-ring",
      isDisabled && "cursor-not-allowed opacity-50",
    )}
  >
    <AriaSelectValue<SelectItemType>
      className={(_state) =>
        cn(
          "flex h-max w-full items-center justify-start truncate text-left align-middle",
          triggerSizes[size].root,
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
              <section className={cn("flex w-full truncate", triggerSizes[size].textContainer)}>
                <p className={cn("truncate font-medium text-foreground", triggerSizes[size].text)}>
                  {selectedItem.label}
                </p>
                {selectedItem.supportingText && (
                  <p className={cn("text-muted-foreground", triggerSizes[size].text)}>
                    {selectedItem.supportingText}
                  </p>
                )}
              </section>
            ) : (
              <p className={cn("text-muted-foreground", triggerSizes[size].text)}>{placeholder}</p>
            )}

            <span className="ml-auto shrink-0 text-muted-foreground">
              <SvgIcon name="chevron-down" size={size === "lg" ? 20 : 16} />
            </span>
          </>
        );
      }}
    </AriaSelectValue>
  </AriaButton>
);
