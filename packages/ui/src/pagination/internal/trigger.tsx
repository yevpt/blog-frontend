"use client";

import { cloneElement, isValidElement } from "react";
import type { FC, HTMLAttributes } from "react";
import { Button } from "../../button";
import type { PaginationTriggerProps } from "../types";
import { usePaginationContext } from "./context";

/** 上一页/下一页触发器，支持 render prop 与 asChild 两种自定义形态。 */
const Trigger: FC<PaginationTriggerProps> = ({
  children,
  style,
  className,
  asChild = false,
  direction,
  ariaLabel,
}) => {
  const { currentPage, total, onPageChange } = usePaginationContext();

  const isDisabled = direction === "prev" ? currentPage <= 1 : currentPage >= total;

  const handleClick = () => {
    if (isDisabled) return;
    const newPage = direction === "prev" ? currentPage - 1 : currentPage + 1;
    onPageChange?.(newPage);
  };

  const computedClassName = typeof className === "function" ? className({ isDisabled }) : className;
  const defaultAriaLabel = direction === "prev" ? "Previous Page" : "Next Page";

  if (typeof children === "function") {
    return <>{children({ isDisabled, onClick: handleClick })}</>;
  }

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick,
      disabled: isDisabled,
      "aria-label": ariaLabel || defaultAriaLabel,
      style: { ...(children.props as HTMLAttributes<HTMLElement>).style, ...style },
      className:
        [computedClassName, (children.props as HTMLAttributes<HTMLElement>).className]
          .filter(Boolean)
          .join(" ") || undefined,
    } as HTMLAttributes<HTMLElement>);
  }

  return (
    <Button
      variant="ghost"
      aria-label={ariaLabel || defaultAriaLabel}
      onPress={handleClick}
      isDisabled={isDisabled}
      style={style}
      className={computedClassName}
    >
      {children}
    </Button>
  );
};

export const PaginationPrevTrigger: FC<Omit<PaginationTriggerProps, "direction">> = (props) => (
  <Trigger {...props} direction="prev" />
);

export const PaginationNextTrigger: FC<Omit<PaginationTriggerProps, "direction">> = (props) => (
  <Trigger {...props} direction="next" />
);
