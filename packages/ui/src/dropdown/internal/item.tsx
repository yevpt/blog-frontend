"use client";

import { MenuItem as AriaMenuItem, Text } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../../avatar/avatar";
import { cn } from "../../lib/utils";
import { menuItemInnerClasses } from "../../lib/control-variants";
import type { DropdownItemProps } from "../types";
import { SelectionIndicator } from "./selection-indicator";

/** 带图标/头像/选中态指示器的菜单项；`unstyled` 时退化为原生 MenuItem。 */
export const DropdownItem = ({
  label,
  description,
  children,
  addon,
  icon: Icon,
  avatarUrl,
  unstyled,
  selectionIndicator = "checkmark",
  danger,
  ...props
}: DropdownItemProps) => {
  const textValue =
    props.textValue ?? label ?? (typeof children === "string" ? children : undefined);

  if (unstyled) {
    return (
      <AriaMenuItem id={label} textValue={textValue} {...props}>
        {children}
      </AriaMenuItem>
    );
  }

  return (
    <AriaMenuItem
      {...props}
      textValue={textValue}
      className={(state) =>
        cn(
          "group block cursor-pointer px-1.5 py-px outline-hidden",
          state.isDisabled && "cursor-not-allowed opacity-50",
          typeof props.className === "function" ? props.className(state) : props.className,
        )
      }
    >
      {(state) => (
        <div
          className={cn(
            menuItemInnerClasses.base,
            !state.isDisabled && !danger && menuItemInnerClasses.hover,
            !state.isDisabled && danger && menuItemInnerClasses.hoverDanger,
            state.isFocused && !danger && menuItemInnerClasses.focused,
            state.isFocused && danger && menuItemInnerClasses.focusedDanger,
            state.isFocusVisible && "ring-2 ring-ring ring-inset",
            state.hasSubmenu && "pr-1.5",
          )}
        >
          {state.selectionMode !== "none" && !avatarUrl && !Icon && (
            <SelectionIndicator variant={selectionIndicator} {...state} className="mr-2" />
          )}

          {avatarUrl && (
            <div className="mr-2 flex size-4 items-center justify-center">
              <Avatar aria-hidden="true" size="xs" src={avatarUrl} alt={label} className="size-5" />
            </div>
          )}

          {Icon && (
            <Icon
              aria-hidden="true"
              className={cn(
                "mr-2 size-4 shrink-0",
                danger ? "text-destructive" : "text-muted-foreground",
              )}
            />
          )}

          <div className="min-w-0 grow">
            <Text
              slot="label"
              className={cn("block truncate", danger ? "text-destructive" : "text-foreground")}
            >
              {label || (typeof children === "function" ? children(state) : children)}
            </Text>
            {description && (
              <Text
                slot="description"
                className="mt-0.5 block truncate text-xs font-normal text-muted-foreground"
              >
                {description}
              </Text>
            )}
          </div>

          {addon && (
            <span className="ml-1 shrink-0 pr-1 text-xs font-medium text-muted-foreground">
              {addon}
            </span>
          )}

          {state.selectionMode !== "none" && (avatarUrl || Icon) && (
            <SelectionIndicator variant={selectionIndicator} {...state} className="ml-1" />
          )}

          {state.hasSubmenu && (
            <span className="ml-auto">
              <SvgIcon name="chevron-right" size={16} />
            </span>
          )}
        </div>
      )}
    </AriaMenuItem>
  );
};
