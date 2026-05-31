"use client";

import {
  TextField,
  type TextFieldProps,
  Label,
  Input as AriaInput,
  FieldError,
  Text,
} from "react-aria-components";
import type { IconName } from "@repo/icons";
import { SvgIcon } from "@repo/icons";
import { cn } from "./lib/utils";

export interface InputProps extends Omit<TextFieldProps, "className" | "style"> {
  /** 字段标签；传空字符串或省略则不渲染 label */
  label?: string;
  /** 左侧图标名称（来自 @repo/icons） */
  iconName?: IconName;
  /** placeholder 文字 */
  placeholder?: string;
  /** 底部提示文字（isInvalid 时隐藏，改由 FieldError 显示） */
  hint?: string;
  size?: "sm" | "md";
  className?: string;
  /** input 元素自身的额外 className */
  inputClassName?: string;
}

export function Input({
  label,
  iconName,
  placeholder,
  hint,
  size = "sm",
  className,
  inputClassName,
  isInvalid,
  "aria-label": ariaLabel,
  ...props
}: InputProps) {
  // 无可见 label 时，用 placeholder 或 aria-label 满足无障碍要求
  const resolvedAriaLabel = ariaLabel ?? (!label ? placeholder : undefined);

  return (
    <TextField
      className={cn("flex flex-col gap-1.5 w-full", className)}
      isInvalid={isInvalid}
      {...props}
      aria-label={resolvedAriaLabel}
    >
      {label ? <Label className="text-sm font-medium text-foreground">{label}</Label> : null}

      <div className="relative flex items-center">
        {iconName && (
          <span className="absolute left-3 pointer-events-none text-muted-foreground z-10">
            <SvgIcon name={iconName} size={16} />
          </span>
        )}
        <AriaInput
          placeholder={placeholder}
          className={cn(
            "w-full rounded-md border border-input bg-background text-sm",
            "transition-colors outline-none",
            "focus:ring-2 focus:ring-ring focus:border-transparent",
            "placeholder:text-muted-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            size === "sm" ? "h-9 py-2" : "h-10 py-2.5",
            iconName ? "pl-9 pr-4" : "px-4",
            inputClassName,
          )}
        />
      </div>

      {hint && !isInvalid ? (
        <Text slot="description" className="text-xs text-muted-foreground">
          {hint}
        </Text>
      ) : null}

      <FieldError className="text-xs text-destructive" />
    </TextField>
  );
}
