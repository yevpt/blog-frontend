"use client";

import { CarouselContent, CarouselItem } from "./internal/content";
import { CarouselIndicator, CarouselIndicatorGroup } from "./internal/indicator";
import { CarouselRoot } from "./internal/root";
import { CarouselNextTrigger, CarouselPrevTrigger } from "./internal/trigger";

/** 复合轮播组件，通过命名空间属性组合各部分。 */
export const Carousel = {
  Root: CarouselRoot,
  Content: CarouselContent,
  Item: CarouselItem,
  PrevTrigger: CarouselPrevTrigger,
  NextTrigger: CarouselNextTrigger,
  IndicatorGroup: CarouselIndicatorGroup,
  Indicator: CarouselIndicator,
};
