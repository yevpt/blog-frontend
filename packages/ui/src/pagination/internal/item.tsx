"use client";

import { cloneElement, isValidElement } from "react";
import type { HTMLAttributes } from "react";
import { Button } from "../../button";
import type { PaginationItemProps } from "../types";
import { usePaginationContext } from "./context";

/** 单个页码项，支持 render prop 与 asChild 两种自定义形态。 */
export const PaginationItem = ({
  value,
  isCurrent,
  children,
  style,
  className,
  ariaLabel,
  asChild = false,
}: PaginationItemProps) => {
  const { onPageChange } = usePaginationContext();

  const isSelected = isCurrent;
  const handleClick = () => onPageChange?.(value);

  const computedClassName = typeof className === "function" ? className({ isSelected }) : className;

  if (typeof children === "function") {
    return (
      <>
        {children({
          isSelected,
          onClick: handleClick,
          value,
          "aria-current": isCurrent ? "page" : undefined,
          "aria-label": ariaLabel || `Page ${value}`,
        })}
      </>
    );
  }

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick,
      "aria-current": isCurrent ? "page" : undefined,
      "aria-label": ariaLabel || `Page ${value}`,
      style: { ...(children.props as HTMLAttributes<HTMLElement>).style, ...style },
      className:
        [computedClassName, (children.props as HTMLAttributes<HTMLElement>).className]
          .filter(Boolean)
          .join(" ") || undefined,
    } as HTMLAttributes<HTMLElement>);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onPress={handleClick}
      style={style}
      className={computedClassName}
      aria-current={isCurrent ? "page" : undefined}
      aria-label={ariaLabel || `Page ${value}`}
    >
      {children}
    </Button>
  );
};
