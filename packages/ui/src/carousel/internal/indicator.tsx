"use client";

import { cloneElement, isValidElement } from "react";
import type { HTMLAttributes } from "react";
import { Button } from "../../button";
import { useCarousel } from "../hooks/use-carousel";
import type { CarouselIndicatorGroupProps, CarouselIndicatorProps } from "../types";

/** 跳转到指定下标的指示点，支持 render prop 与子元素克隆。 */
export const CarouselIndicator = ({
  index,
  isSelected = false,
  children,
  asChild: _asChild,
  className,
  style,
  "aria-label": ariaLabel,
}: CarouselIndicatorProps) => {
  const { api, selectedIndex } = useCarousel();

  const selected = isSelected || selectedIndex === index;

  const handleClick = () => {
    api?.scrollTo(index);
  };
  const computedClassName =
    typeof className === "function" ? className({ isSelected: selected }) : className;

  const defaultAriaLabel = ariaLabel ?? `Go to slide ${index + 1}`;

  // 渲染函数形态。
  if (typeof children === "function") {
    return <>{children({ isSelected: selected, onClick: handleClick })}</>;
  }

  // 子元素克隆形态。
  if (isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick,
      "aria-label": defaultAriaLabel,
      "aria-current": selected ? "true" : undefined,
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
      aria-label={defaultAriaLabel}
      aria-current={selected ? "true" : undefined}
      className={computedClassName}
      onPress={handleClick}
    >
      {children}
    </Button>
  );
};

/** 指示点容器，可用 render prop 按 scrollSnaps 数量批量渲染。 */
export const CarouselIndicatorGroup = ({ children, ...props }: CarouselIndicatorGroupProps) => {
  const { scrollSnaps } = useCarousel();

  if (typeof children === "function") {
    return <nav {...props}>{scrollSnaps.map((index) => children({ index }))}</nav>;
  }

  return <nav {...props}>{children}</nav>;
};
