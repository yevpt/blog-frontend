"use client";

import {
  Button as AriaButton,
  FieldError,
  Input as AriaInput,
  Label,
  SearchField as AriaSearchField,
  Text,
  type SearchFieldProps as AriaSearchFieldProps,
  type ValidationResult,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";

import { cn } from "./lib/utils";

export interface SearchFieldProps extends Omit<AriaSearchFieldProps, "className" | "style"> {
  /** 字段标签；传空字符串或省略则不渲染 label */
  label?: string;
  /** placeholder 文字 */
  placeholder?: string;
  /** 底部提示文字（isInvalid 时隐藏，改由 FieldError 显示） */
  hint?: string;
  /** 校验错误文案 */
  errorMessage?: string | ((validation: ValidationResult) => string);
  size?: "sm" | "md";
  className?: string;
  /** input 元素自身的额外 className */
  inputClassName?: string;
  /** 清除按钮的无障碍标签 */
  clearLabel?: string;
}

export function SearchField({
  label,
  placeholder,
  hint,
  errorMessage,
  size = "sm",
  className,
  inputClassName,
  clearLabel = "清除搜索",
  isInvalid,
  "aria-label": ariaLabel,
  ...props
}: SearchFieldProps) {
  // 无可见 label 时，用 placeholder 或 aria-label 满足无障碍要求
  const resolvedAriaLabel = ariaLabel ?? (!label ? placeholder : undefined);

  return (
    <AriaSearchField
      className={cn("group flex flex-col gap-1.5 w-full", className)}
      isInvalid={isInvalid}
      {...props}
      aria-label={resolvedAriaLabel}
    >
      {label ? <Label className="text-sm font-medium text-foreground">{label}</Label> : null}

      <div className="relative flex items-center">
        <span className="absolute left-3 pointer-events-none text-muted-foreground z-10">
          <SvgIcon name="search" size={16} />
        </span>
        <AriaInput
          placeholder={placeholder}
          className={cn(
            "w-full rounded-md border border-input bg-background text-sm",
            "transition-colors outline-none",
            "focus:ring-2 focus:ring-ring focus:border-transparent",
            "placeholder:text-muted-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            size === "sm" ? "h-9 py-2" : "h-10 py-2.5",
            "pl-9 pr-9",
            inputClassName,
          )}
        />
        <AriaButton
          aria-label={clearLabel}
          className={cn(
            "absolute right-1 inline-flex items-center justify-center rounded-md",
            "text-muted-foreground transition-colors outline-none",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:pointer-events-none disabled:opacity-50",
            "group-data-[empty]:invisible",
            size === "sm" ? "size-7" : "size-8",
          )}
        >
          <SvgIcon name="close" size={14} />
        </AriaButton>
      </div>

      {hint && !isInvalid ? (
        <Text slot="description" className="text-xs text-muted-foreground">
          {hint}
        </Text>
      ) : null}

      <FieldError className="text-xs text-destructive">{errorMessage}</FieldError>
    </AriaSearchField>
  );
}
