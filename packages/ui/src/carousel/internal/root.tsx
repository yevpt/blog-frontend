"use client";

import { cn } from "../../lib/utils";
import { CarouselContext, useCarouselState } from "../hooks/use-carousel";
import type { CarouselRootProps } from "../types";

/** 轮播根容器：初始化状态、注入 context、绑定键盘导航。 */
export const CarouselRoot = ({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: CarouselRootProps) => {
  const { contextValue, handleKeyDown } = useCarouselState({ orientation, opts, plugins, setApi });

  return (
    <CarouselContext.Provider value={contextValue}>
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
};
