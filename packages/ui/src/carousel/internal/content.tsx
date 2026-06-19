"use client";

import type { ComponentPropsWithRef } from "react";
import { cn } from "../../lib/utils";
import { useCarousel } from "../hooks/use-carousel";
import type { CarouselContentProps } from "../types";

/** 轮播视口 + 轨道容器，根据方向决定主轴。 */
export const CarouselContent = ({
  className,
  overflowHidden = true,
  ...props
}: CarouselContentProps) => {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className={cn("h-full w-full", overflowHidden && "overflow-hidden")}>
      <div
        className={cn("flex max-h-full", orientation === "horizontal" ? "" : "flex-col", className)}
        {...props}
      />
    </div>
  );
};

/** 单个轮播项。 */
export const CarouselItem = ({ className, ...props }: ComponentPropsWithRef<"div">) => {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
      {...props}
    />
  );
};
