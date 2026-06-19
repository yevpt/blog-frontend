"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { CarouselApi, CarouselContextValue, CarouselProps } from "../types";

export const CarouselContext = createContext<CarouselContextValue | null>(null);

/** 读取当前 `Carousel.Root` 提供的状态；脱离 Root 使用时抛错。 */
export const useCarousel = () => {
  const context = useContext(CarouselContext);

  if (!context) {
    throw new Error("The `useCarousel` hook must be used within a <Carousel />");
  }

  return context;
};

/** Root 内部状态：封装 embla 初始化、滚动控制、事件订阅与键盘导航。 */
export const useCarouselState = ({
  orientation = "horizontal",
  opts,
  plugins,
  setApi,
}: Pick<CarouselProps, "orientation" | "opts" | "plugins" | "setApi">) => {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onInit = useCallback((api: CarouselApi) => {
    if (!api) return;

    setScrollSnaps(api.scrollSnapList());
  }, []);

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;

    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

  useEffect(() => {
    if (!api || !setApi) return;

    setApi(api);
  }, [api, setApi]);

  useEffect(() => {
    if (!api) return;

    onInit(api);
    onSelect(api);

    api.on("reInit", onInit);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api?.off("select", onSelect);
    };
  }, [api, onInit, onSelect]);

  const contextValue: CarouselContextValue = {
    carouselRef,
    api,
    opts,
    orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
    scrollPrev,
    scrollNext,
    canScrollPrev,
    canScrollNext,
    selectedIndex,
    scrollSnaps,
  };

  return { contextValue, handleKeyDown };
};
