"use client";

import { Switch as AriaSwitch } from "react-aria-components";
import { cn } from "../lib/utils";
import type { ToggleBaseProps, ToggleProps } from "./types";

export const ToggleBase = ({
  className,
  isHovered,
  isDisabled,
  isFocusVisible,
  isSelected,
  slim,
  size = "sm",
}: ToggleBaseProps) => {
  const styles = {
    default: {
      sm: { root: "h-5 w-9 p-0.5", switch: cn("size-4", isSelected && "translate-x-4") },
      md: { root: "h-6 w-11 p-0.5", switch: cn("size-5", isSelected && "translate-x-5") },
    },
    slim: {
      sm: { root: "h-4 w-8", switch: cn("size-4", isSelected && "translate-x-4") },
      md: { root: "h-5 w-10", switch: cn("size-5", isSelected && "translate-x-5") },
    },
  };
  const classes = slim ? styles.slim[size] : styles.default[size];

  return (
    <div
      className={cn(
        "cursor-pointer rounded-full bg-muted ring-[0.5px] ring-input outline-none transition duration-150 ease-linear ring-inset",
        isSelected && "bg-primary",
        isSelected && isHovered && "bg-primary/90",
        isDisabled && "cursor-not-allowed opacity-50",
        isFocusVisible && "outline-2 outline-offset-2 outline-ring",
        slim && "ring-1",
        slim && isSelected && "ring-transparent",
        classes.root,
        className,
      )}
    >
      <div
        style={{ transition: "transform 0.15s ease-in-out" }}
        // 滑块始终为白：需同时在 muted 轨道与 primary 轨道上保持对比，无对应语义令牌，故保留 bg-white
        className={cn("rounded-full bg-white shadow-sm", classes.switch)}
      />
    </div>
  );
};

const sizeStyles = {
  sm: { root: "gap-2", textWrapper: "", label: "text-sm font-medium", hint: "text-sm" },
  md: { root: "gap-3", textWrapper: "gap-0.5", label: "text-base font-medium", hint: "text-base" },
};

export const Toggle = ({
  label,
  hint,
  className,
  size = "sm",
  slim,
  ...ariaSwitchProps
}: ToggleProps) => (
  <AriaSwitch
    {...ariaSwitchProps}
    className={(state) =>
      cn(
        "relative flex w-max items-start",
        state.isDisabled && "cursor-not-allowed",
        sizeStyles[size].root,
        typeof className === "function" ? className(state) : className,
      )
    }
  >
    {({ isSelected, isDisabled, isFocusVisible, isHovered }) => (
      <>
        <ToggleBase
          slim={slim}
          size={size}
          isHovered={isHovered}
          isDisabled={isDisabled}
          isFocusVisible={isFocusVisible}
          isSelected={isSelected}
          className={slim ? "mt-0.5" : ""}
        />
        {(label || hint) && (
          <div className={cn("flex flex-col", sizeStyles[size].textWrapper)}>
            {label && (
              <p className={cn("text-foreground select-none", sizeStyles[size].label)}>{label}</p>
            )}
            {hint && (
              // hint 区域阻止冒泡，防止点击提示文字触发 toggle（如 hint 内含链接时）
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
  </AriaSwitch>
);
