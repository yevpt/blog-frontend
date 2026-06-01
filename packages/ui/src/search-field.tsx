"use client";

import {
  Button as AriaButton,
  FieldError,
  Group,
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

      <Group
        className={cn(
          "flex items-center rounded-md border border-input bg-background",
          "transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent",
          "group-data-[invalid]:border-destructive",
          "group-data-[disabled]:opacity-50 group-data-[disabled]:cursor-not-allowed",
          size === "sm" ? "h-9" : "h-10",
        )}
      >
        <span className="pl-3 text-muted-foreground pointer-events-none shrink-0">
          <SvgIcon name="search" size={16} />
        </span>
        <AriaInput
          placeholder={placeholder}
          className={cn(
            "flex-1 min-w-0 bg-transparent text-sm px-2 h-full outline-none",
            "placeholder:text-muted-foreground",
            "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            inputClassName,
          )}
        />
        <AriaButton
          aria-label={clearLabel}
          className={cn(
            "mr-1 shrink-0 inline-flex items-center justify-center rounded-md",
            "text-muted-foreground transition-colors outline-none",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:pointer-events-none",
            "group-data-[empty]:invisible",
            size === "sm" ? "size-7" : "size-8",
          )}
        >
          <SvgIcon name="close" size={14} />
        </AriaButton>
      </Group>

      {hint && !isInvalid ? (
        <Text slot="description" className="text-xs text-muted-foreground">
          {hint}
        </Text>
      ) : null}

      <FieldError className="text-xs text-destructive">{errorMessage}</FieldError>
    </AriaSearchField>
  );
}
