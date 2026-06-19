"use client";

import { Checkbox as AriaCheckbox } from "react-aria-components";
import { cn } from "../lib/utils";
import type { CheckboxBaseProps, CheckboxProps } from "./types";

export const CheckboxBase = ({
  className,
  isSelected,
  isDisabled,
  isIndeterminate,
  size = "sm",
  isFocusVisible = false,
}: CheckboxBaseProps) => (
  <div
    className={cn(
      "relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded bg-card ring-1 ring-input ring-inset",
      size === "md" && "size-5 rounded-md",
      (isSelected || isIndeterminate) && "bg-primary ring-primary",
      isDisabled && "cursor-not-allowed opacity-50",
      isDisabled && !(isSelected || isIndeterminate) && "bg-muted",
      isFocusVisible && "outline-2 outline-offset-2 outline-ring",
      className,
    )}
  >
    {/* Indeterminate line */}
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      className={cn(
        "pointer-events-none absolute h-3 w-2.5 text-primary-foreground opacity-0 transition-all",
        size === "md" && "size-3.5",
        isIndeterminate && "opacity-100",
      )}
    >
      <path
        d="M2.91675 7H11.0834"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    {/* Check mark */}
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      className={cn(
        "pointer-events-none absolute size-3 text-primary-foreground opacity-0 transition-all",
        size === "md" && "size-3.5",
        isSelected && !isIndeterminate && "opacity-100",
      )}
    >
      <path
        d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
CheckboxBase.displayName = "CheckboxBase";

const sizeStyles = {
  sm: { root: "gap-2", textWrapper: "", label: "text-sm font-medium", hint: "text-sm" },
  md: { root: "gap-3", textWrapper: "gap-0.5", label: "text-base font-medium", hint: "text-base" },
};

export const Checkbox = ({
  label,
  hint,
  size = "sm",
  className,
  ...ariaCheckboxProps
}: CheckboxProps) => (
  <AriaCheckbox
    {...ariaCheckboxProps}
    className={(state) =>
      cn(
        "relative flex items-start",
        state.isDisabled && "cursor-not-allowed",
        sizeStyles[size].root,
        typeof className === "function" ? className(state) : className,
      )
    }
  >
    {({ isSelected, isIndeterminate, isDisabled, isFocusVisible }) => (
      <>
        <CheckboxBase
          size={size}
          isSelected={isSelected}
          isIndeterminate={isIndeterminate}
          isDisabled={isDisabled}
          isFocusVisible={isFocusVisible}
          className={label || hint ? "mt-0.5" : ""}
        />
        {(label || hint) && (
          <div className={cn("inline-flex flex-col", sizeStyles[size].textWrapper)}>
            {label && (
              <p className={cn("text-foreground select-none", sizeStyles[size].label)}>{label}</p>
            )}
            {hint && (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <span
                className={cn("text-muted-foreground", sizeStyles[size].hint)}
                onClick={(e) => e.stopPropagation()}
              >
                {hint}
              </span>
            )}
          </div>
        )}
      </>
    )}
  </AriaCheckbox>
);
Checkbox.displayName = "Checkbox";
