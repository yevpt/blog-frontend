"use client";

import { type ComponentType, type ReactNode, type Ref, useState } from "react";
import type { TextFieldProps as AriaTextFieldProps } from "react-aria-components";
import {
  Button as AriaButton,
  Group as AriaGroup,
  Input as AriaInput,
  TextField as AriaTextField,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { HintText } from "./hint-text";
import { Label } from "./label";
import { cn } from "../lib/utils";

export interface InputProps extends Omit<AriaTextFieldProps, "children"> {
  label?: string;
  hint?: string;
  tooltip?: string;
  tooltipDescription?: string;
  placeholder?: string;
  size?: "sm" | "md";
  inputClassName?: string;
  leadingIcon?: ComponentType<{ className?: string }> | ReactNode;
  trailingIcon?: ComponentType<{ className?: string }> | ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const sizes = {
  sm: { root: "py-2 px-3 gap-2 text-sm", icon: "size-4" },
  md: { root: "py-2.5 px-3.5 gap-2 text-base", icon: "size-5" },
};

export const Input = ({
  label,
  hint,
  tooltip,
  tooltipDescription,
  placeholder,
  size = "md",
  inputClassName,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  type,
  className,
  ...rest
}: InputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (isPasswordVisible ? "text" : "password") : type;

  return (
    <AriaTextField
      {...rest}
      type={resolvedType}
      className={(state) =>
        cn(
          "group flex flex-col gap-1.5",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {({ isRequired, isInvalid }) => (
        <>
          {label && (
            <Label
              isRequired={isRequired}
              isInvalid={isInvalid}
              tooltip={tooltip}
              tooltipDescription={tooltipDescription}
            >
              {label}
            </Label>
          )}
          <AriaGroup
            className={cn(
              "relative flex w-full items-center rounded-lg bg-white shadow-xs ring-1 ring-gray-300 outline-none transition duration-100 ring-inset",
              "focus-within:ring-2 focus-within:ring-blue-500",
              "group-disabled:cursor-not-allowed group-disabled:opacity-50",
              isInvalid && "ring-red-500 focus-within:ring-red-500",
              sizes[size].root,
            )}
          >
            {LeadingIcon && typeof LeadingIcon === "function" ? (
              <LeadingIcon className={cn("shrink-0 text-gray-400", sizes[size].icon)} />
            ) : (
              LeadingIcon
            )}
            <AriaInput
              placeholder={placeholder}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none",
                inputClassName,
              )}
            />
            {isPassword && (
              <AriaButton
                type="button"
                onPress={() => setIsPasswordVisible((v) => !v)}
                className="shrink-0 text-gray-400 hover:text-gray-600 outline-none"
              >
                {isPasswordVisible ? (
                  <SvgIcon name="eye-off" size={16} />
                ) : (
                  <SvgIcon name="eye" size={16} />
                )}
              </AriaButton>
            )}
            {TrailingIcon &&
              !isPassword &&
              (typeof TrailingIcon === "function" ? (
                <TrailingIcon className={cn("shrink-0 text-gray-400", sizes[size].icon)} />
              ) : (
                TrailingIcon
              ))}
          </AriaGroup>
          {hint && <HintText size={size === "sm" ? "sm" : "md"}>{hint}</HintText>}
        </>
      )}
    </AriaTextField>
  );
};
