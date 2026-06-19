"use client";

import type { ReactNode } from "react";
import {
  TagGroup as AriaTagGroup,
  TagList as AriaTagList,
  Tag as AriaTag,
  Label,
  Text,
} from "react-aria-components";

import { cn } from "../lib/utils";
import type { TagGroupWrapperProps, TagItemProps, TagListWrapperProps } from "./types";

// ─── TagGroup（容器） ─────────────────────────────────────────────────────────

export function TagGroup({ label, hint, className, children, ...props }: TagGroupWrapperProps) {
  return (
    <AriaTagGroup
      aria-label={label ?? props["aria-label"] ?? "标签组"}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {label && <Label className="text-sm font-semibold">{label}</Label>}
      {children}
      {hint && (
        <Text slot="description" className="text-xs text-muted-foreground">
          {hint}
        </Text>
      )}
    </AriaTagGroup>
  );
}

// ─── TagList（列表容器） ──────────────────────────────────────────────────────

export function TagList<T extends object>({ className, ...props }: TagListWrapperProps<T>) {
  return <AriaTagList className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

// ─── TagItem（单个标签） ──────────────────────────────────────────────────────

function resolveTagTextValue(children: ReactNode, count: number | undefined, textValue?: string) {
  if (textValue) return textValue;
  const label = typeof children === "string" ? children : "";
  return count !== undefined ? `${label} ${count}` : label;
}

export function TagItem({ count, className, children, textValue, ...props }: TagItemProps) {
  const accessibleLabel = resolveTagTextValue(children, count, textValue);

  return (
    <AriaTag
      {...props}
      textValue={accessibleLabel}
      aria-label={accessibleLabel}
      className={({ isSelected, isFocusVisible }) =>
        cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
          "transition-colors cursor-pointer select-none outline-none",
          isFocusVisible && "ring-2 ring-ring ring-offset-1",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          className,
        )
      }
    >
      {children}
      {count !== undefined && <span className="opacity-60">{count}</span>}
    </AriaTag>
  );
}
