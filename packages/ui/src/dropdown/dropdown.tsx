"use client";

import { type FC, type RefAttributes, useCallback } from "react";
import type {
  ButtonProps as AriaButtonProps,
  MenuItemProps as AriaMenuItemProps,
  MenuProps as AriaMenuProps,
  PopoverProps as AriaPopoverProps,
  SeparatorProps as AriaSeparatorProps,
  MenuItemRenderProps,
} from "react-aria-components";
import {
  Button as AriaButton,
  Header as AriaHeader,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
  Separator as AriaSeparator,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Avatar } from "../avatar/avatar";
import { CheckboxBase } from "../checkbox/checkbox";
import { RadioButtonBase } from "../radio-buttons/radio-buttons";
import { ToggleBase } from "../toggle/toggle";
import { cn } from "../lib/utils";

interface DropdownItemProps extends AriaMenuItemProps {
  label?: string;
  addon?: string;
  unstyled?: boolean;
  icon?: FC<{ className?: string }>;
  avatarUrl?: string;
  selectionIndicator?: "checkmark" | "checkbox" | "radio" | "toggle" | "none";
}

const DropdownItem = ({
  label,
  children,
  addon,
  icon: Icon,
  avatarUrl,
  unstyled,
  selectionIndicator = "checkmark",
  ...props
}: DropdownItemProps) => {
  const SelectionIndicator = useCallback(
    (state: MenuItemRenderProps & { className?: string }) => {
      if (selectionIndicator === "checkmark") {
        return (
          <span className={cn("shrink-0", !state.isSelected && "invisible", state.className)}>
            <SvgIcon name="check" size={16} />
          </span>
        );
      }
      if (selectionIndicator === "checkbox") {
        return (
          <CheckboxBase
            isSelected={state.isSelected && !state.hasSubmenu}
            isIndeterminate={state.isSelected && state.hasSubmenu}
            size="sm"
            className={cn("shrink-0", state.className)}
          />
        );
      }
      if (selectionIndicator === "radio") {
        return (
          <RadioButtonBase
            isSelected={state.isSelected}
            className={cn("shrink-0", state.className)}
          />
        );
      }
      if (selectionIndicator === "toggle") {
        return (
          <ToggleBase
            slim
            size="sm"
            isSelected={state.isSelected}
            className={cn("shrink-0", state.className)}
          />
        );
      }
      return null;
    },
    [selectionIndicator],
  );

  if (unstyled) {
    return (
      <AriaMenuItem id={label} textValue={label} {...props}>
        {children}
      </AriaMenuItem>
    );
  }

  return (
    <AriaMenuItem
      {...props}
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
            "relative flex items-center rounded-md px-2.5 py-2 outline-none transition duration-100 ease-linear",
            !state.isDisabled && "group-hover:bg-gray-50",
            state.isFocused && "bg-gray-50",
            state.isFocusVisible && "ring-2 ring-blue-500 ring-inset -ring-offset-2",
            state.hasSubmenu && "pr-1.5",
          )}
        >
          {state.selectionMode !== "none" && !avatarUrl && !Icon && (
            <SelectionIndicator {...state} className="mr-2" />
          )}

          {avatarUrl && (
            <div className="mr-2 flex size-4 items-center justify-center">
              <Avatar aria-hidden="true" size="xs" src={avatarUrl} alt={label} className="size-5" />
            </div>
          )}

          {Icon && <Icon aria-hidden="true" className="mr-2 size-4 shrink-0 text-gray-400" />}

          <span
            className={cn(
              "grow truncate text-sm font-semibold text-gray-700",
              state.isFocused && "text-gray-900",
            )}
          >
            {label || (typeof children === "function" ? children(state) : children)}
          </span>

          {addon && (
            <span className="ml-1 shrink-0 pr-1 text-xs font-medium text-gray-400">{addon}</span>
          )}

          {state.selectionMode !== "none" && (avatarUrl || Icon) && (
            <SelectionIndicator {...state} className="ml-1" />
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

type DropdownMenuProps<T extends object> = AriaMenuProps<T>;

const DropdownMenu = <T extends object>(props: DropdownMenuProps<T>) => (
  <AriaMenu
    {...props}
    className={(state) =>
      cn(
        "h-min overflow-y-auto py-1 outline-hidden select-none",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  />
);

type DropdownPopoverProps = AriaPopoverProps;

const DropdownPopover = (props: DropdownPopoverProps) => (
  <AriaPopover
    placement="bottom right"
    {...props}
    className={(state) =>
      cn(
        "w-56 overflow-auto rounded-lg bg-white shadow-lg ring-1 ring-gray-200",
        state.isEntering &&
          "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
        state.isExiting &&
          "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  >
    {props.children}
  </AriaPopover>
);

const DropdownSeparator = (props: AriaSeparatorProps) => (
  <AriaSeparator {...props} className={cn("my-1 h-px w-full bg-gray-200", props.className)} />
);

const DropdownDotsButton = (props: AriaButtonProps & RefAttributes<HTMLButtonElement>) => (
  <AriaButton
    {...props}
    aria-label={props["aria-label"] ?? "Open menu"}
    className={(state) =>
      cn(
        "cursor-pointer rounded-md text-gray-400 outline-none transition duration-100 ease-linear",
        (state.isPressed || state.isHovered) && "text-gray-600",
        (state.isPressed || state.isFocusVisible) && "ring-2 ring-blue-500 ring-offset-2",
        typeof props.className === "function" ? props.className(state) : props.className,
      )
    }
  >
    <SvgIcon name="dots-vertical" size={20} />
  </AriaButton>
);

export const Dropdown = {
  Root: AriaMenuTrigger,
  Popover: DropdownPopover,
  Menu: DropdownMenu,
  Section: AriaMenuSection,
  SectionHeader: AriaHeader,
  Item: DropdownItem,
  Separator: DropdownSeparator,
  DotsButton: DropdownDotsButton,
};
