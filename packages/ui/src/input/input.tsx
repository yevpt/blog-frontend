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
  sm: { root: "h-9 px-3 gap-2 text-sm", icon: "size-4" },
  md: { root: "h-[42px] px-3 gap-2 text-[15px]", icon: "size-5" },
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
              "relative flex w-full items-center rounded-xl bg-card/75 shadow-xs ring-1 ring-input outline-none transition-[background-color,box-shadow] duration-150 ring-inset",
              "hover:bg-card/90 hover:ring-foreground/20",
              "focus-within:bg-card focus-within:ring-1 focus-within:ring-primary/55 focus-within:shadow-[0_0_0_3px_rgb(from_var(--color-ring)_r_g_b_/_0.24)]",
              "group-disabled:cursor-not-allowed group-disabled:opacity-50",
              isInvalid && "ring-destructive focus-within:ring-destructive",
              sizes[size].root,
            )}
          >
            {LeadingIcon && typeof LeadingIcon === "function" ? (
              <LeadingIcon className={cn("shrink-0 text-muted-foreground", sizes[size].icon)} />
            ) : (
              LeadingIcon
            )}
            <AriaInput
              placeholder={placeholder}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/65 outline-none",
                inputClassName,
              )}
            />
            {isPassword && (
              <AriaButton
                type="button"
                aria-label={isPasswordVisible ? "隐藏密码" : "显示密码"}
                onPress={() => setIsPasswordVisible((v) => !v)}
                className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground data-[pressed]:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isPasswordVisible ? (
                  <SvgIcon name="eye-off" size={18} />
                ) : (
                  <SvgIcon name="eye" size={18} />
                )}
              </AriaButton>
            )}
            {TrailingIcon &&
              !isPassword &&
              (typeof TrailingIcon === "function" ? (
                <TrailingIcon className={cn("shrink-0 text-muted-foreground", sizes[size].icon)} />
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
