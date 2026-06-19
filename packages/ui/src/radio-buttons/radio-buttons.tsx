"use client";

import { createContext, useContext } from "react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from "react-aria-components";
import { cn } from "../lib/utils";
import type {
  RadioButtonBaseProps,
  RadioButtonProps,
  RadioGroupContextType,
  RadioGroupProps,
} from "./types";

const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

export const RadioButtonBase = ({
  className,
  isFocusVisible,
  isSelected,
  isDisabled,
  size = "sm",
}: RadioButtonBaseProps) => (
  <div
    className={cn(
      "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-card ring-1 ring-input ring-inset",
      size === "md" && "size-5",
      isSelected && "bg-primary ring-primary",
      isDisabled && "cursor-not-allowed opacity-50",
      isDisabled && !isSelected && "bg-muted",
      isFocusVisible && "outline-2 outline-offset-2 outline-ring",
      className,
    )}
  >
    <div
      className={cn(
        "size-1.5 rounded-full bg-primary-foreground opacity-0 transition-all",
        size === "md" && "size-2",
        isSelected && "opacity-100",
      )}
    />
  </div>
);
RadioButtonBase.displayName = "RadioButtonBase";

const sizeStyles = {
  sm: { root: "gap-2", textWrapper: "", label: "text-sm font-medium", hint: "text-sm" },
  md: { root: "gap-3", textWrapper: "gap-0.5", label: "text-base font-medium", hint: "text-base" },
};

export const RadioButton = ({
  label,
  hint,
  className,
  size = "sm",
  ...ariaRadioProps
}: RadioButtonProps) => {
  const context = useContext(RadioGroupContext);
  const resolvedSize = context?.size ?? size;

  return (
    <AriaRadio
      {...ariaRadioProps}
      className={(state) =>
        cn(
          "relative flex items-start",
          state.isDisabled && "cursor-not-allowed",
          sizeStyles[resolvedSize].root,
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {({ isSelected, isDisabled, isFocusVisible }) => (
        <>
          <RadioButtonBase
            size={resolvedSize}
            isSelected={isSelected}
            isDisabled={isDisabled}
            isFocusVisible={isFocusVisible}
            className={label || hint ? "mt-0.5" : ""}
          />
          {(label || hint) && (
            <div className={cn("inline-flex flex-col", sizeStyles[resolvedSize].textWrapper)}>
              {label && (
                <p className={cn("text-foreground select-none", sizeStyles[resolvedSize].label)}>
                  {label}
                </p>
              )}
              {hint && (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                <span
                  className={cn("text-muted-foreground", sizeStyles[resolvedSize].hint)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {hint}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </AriaRadio>
  );
};
RadioButton.displayName = "RadioButton";

export const RadioGroup = ({ children, className, size = "sm", ...props }: RadioGroupProps) => (
  <RadioGroupContext.Provider value={{ size }}>
    <AriaRadioGroup {...props} className={cn("flex flex-col gap-4", className)}>
      {children}
    </AriaRadioGroup>
  </RadioGroupContext.Provider>
);
