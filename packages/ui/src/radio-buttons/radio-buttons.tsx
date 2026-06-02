"use client";

import { type ReactNode, type Ref, createContext, useContext } from "react";
import {
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  type RadioProps as AriaRadioProps,
} from "react-aria-components";
import { cn } from "../lib/utils";

export interface RadioGroupContextType {
  size?: "sm" | "md";
}
const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

export interface RadioButtonBaseProps {
  size?: "sm" | "md";
  className?: string;
  isFocusVisible?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

export const RadioButtonBase = ({
  className,
  isFocusVisible,
  isSelected,
  isDisabled,
  size = "sm",
}: RadioButtonBaseProps) => (
  <div
    className={cn(
      "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white ring-1 ring-gray-300 ring-inset",
      size === "md" && "size-5",
      isSelected && "bg-blue-600 ring-blue-600",
      isDisabled && "cursor-not-allowed opacity-50",
      isDisabled && !isSelected && "bg-gray-100",
      isFocusVisible && "outline-2 outline-offset-2 outline-blue-500",
      className,
    )}
  >
    <div
      className={cn(
        "size-1.5 rounded-full bg-white opacity-0 transition-all",
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

interface RadioButtonProps extends AriaRadioProps {
  size?: "sm" | "md";
  label?: ReactNode;
  hint?: ReactNode;
  ref?: Ref<HTMLLabelElement>;
}

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
                <p className={cn("text-gray-700 select-none", sizeStyles[resolvedSize].label)}>
                  {label}
                </p>
              )}
              {hint && (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                <span
                  className={cn("text-gray-500", sizeStyles[resolvedSize].hint)}
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

interface RadioGroupProps extends RadioGroupContextType, AriaRadioGroupProps {
  children: ReactNode;
  className?: string;
}

export const RadioGroup = ({ children, className, size = "sm", ...props }: RadioGroupProps) => (
  <RadioGroupContext.Provider value={{ size }}>
    <AriaRadioGroup {...props} className={cn("flex flex-col gap-4", className)}>
      {children}
    </AriaRadioGroup>
  </RadioGroupContext.Provider>
);
