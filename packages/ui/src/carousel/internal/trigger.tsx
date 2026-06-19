"use client";

import { cloneElement, isValidElement } from "react";
import type { HTMLAttributes } from "react";
import { Button } from "../../button";
import { useCarousel } from "../hooks/use-carousel";
import type { CarouselTriggerProps } from "../types";

/** 上一张/下一张控制按钮，支持 render prop 与 asChild 两种自定义形态。 */
export const Trigger = ({
  className,
  children,
  asChild,
  direction,
  style,
  ...props
}: CarouselTriggerProps) => {
  const { scrollPrev, canScrollNext, scrollNext, canScrollPrev } = useCarousel();

  const isDisabled = direction === "prev" ? !canScrollPrev : !canScrollNext;

  const handleClick = () => {
    if (isDisabled) return;

    if (direction === "prev") {
      scrollPrev();
    } else {
      scrollNext();
    }
  };

  const computedClassName = typeof className === "function" ? className({ isDisabled }) : className;

  const defaultAriaLabel = direction === "prev" ? "Previous slide" : "Next slide";

  // 渲染函数形态：把状态与点击回调交给调用方自行渲染。
  if (typeof children === "function") {
    return <>{children({ isDisabled, onClick: handleClick })}</>;
  }

  // asChild 形态：克隆子元素并注入交互属性。
  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick,
      disabled: isDisabled,
      "aria-label": defaultAriaLabel,
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
      isDisabled={isDisabled}
      className={computedClassName}
      onPress={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
};

export const CarouselPrevTrigger = (props: Omit<CarouselTriggerProps, "direction">) => (
  <Trigger {...props} direction="prev" />
);

export const CarouselNextTrigger = (props: Omit<CarouselTriggerProps, "direction">) => (
  <Trigger {...props} direction="next" />
);
