"use client";

import { useRef, type MouseEvent } from "react";
import {
  Button as AriaButton,
  FieldError,
  Group,
  Input as AriaInput,
  Label,
  SearchField as AriaSearchField,
  Text,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";

import { cn } from "../lib/utils";
import type { SearchFieldProps } from "./types";

export function SearchField({
  label,
  placeholder,
  hint,
  errorMessage,
  size = "sm",
  className,
  inputClassName,
  clearLabel = "清除搜索",
  clearButtonClassName,
  isInvalid,
  "aria-label": ariaLabel,
  ...props
}: SearchFieldProps) {
  // 无可见 label 时，用 placeholder 或 aria-label 满足无障碍要求
  const resolvedAriaLabel = ariaLabel ?? (!label ? placeholder : undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGroupMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (props.isDisabled) return;
    if (event.target instanceof Element && event.target.closest("button,input")) return;

    event.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <AriaSearchField
      className={cn("group flex flex-col gap-1.5 w-full", className)}
      isInvalid={isInvalid}
      {...props}
      aria-label={resolvedAriaLabel}
    >
      {label ? <Label className="text-sm font-medium text-foreground">{label}</Label> : null}

      <Group
        onMouseDown={handleGroupMouseDown}
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
          ref={inputRef}
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
            clearButtonClassName,
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
