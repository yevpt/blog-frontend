"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Carousel } from "@repo/ui";
import { cn } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";
import { FeaturedCarouselSlide } from "./featured-carousel-slide";

const AUTO_PLAY_INTERVAL = 5000;

// CarouselApi 类型从 Carousel.Root setApi prop 推导
type CarouselApi = Parameters<NonNullable<React.ComponentProps<typeof Carousel.Root>["setApi"]>>[0];

interface FeaturedCarouselProps {
  posts: FeaturedPost[];
}

export function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 用于重置进度条动画的 key（每次切换 +1）
  const [animKey, setAnimKey] = useState(0);

  // Embla select 事件同步 currentIndex
  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
      setAnimKey((k) => k + 1);
    };
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // 自动播放
  useEffect(() => {
    if (isHovered) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      if (api) {
        api.scrollNext();
      } else {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % posts.length;
          setAnimKey((k) => k + 1);
          return next;
        });
      }
    }, AUTO_PLAY_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [api, isHovered, posts.length]);

  const handleIndicatorClick = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      setAnimKey((k) => k + 1);
      api?.scrollTo(index);
    },
    [api],
  );

  if (posts.length === 0) return null;

  return (
    <Carousel.Root
      opts={{ loop: true }}
      setApi={setApi}
      aria-label="推荐文章"
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: "520px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Carousel.Content className="h-full">
        {posts.map((post, index) => (
          <Carousel.Item key={post.id} className="h-full">
            <FeaturedCarouselSlide post={post} isLcpCandidate={index === 0} />
          </Carousel.Item>
        ))}
      </Carousel.Content>

      {/* 进度条指示器（替换原点状指示器） */}
      <div className="absolute bottom-4 left-6 right-6 z-20 flex items-center gap-2">
        {posts.map((post, index) => {
          const isActive = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <button
              key={post.id}
              onClick={() => handleIndicatorClick(index)}
              aria-label={`第 ${index + 1} 张，共 ${posts.length} 张`}
              aria-current={isActive ? "true" : undefined}
              className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/25 cursor-pointer relative"
            >
              <span
                key={`${animKey}-${index}`}
                className={cn("absolute inset-y-0 left-0 rounded-full bg-white")}
                style={
                  isActive
                    ? {
                        animation: `progFill ${AUTO_PLAY_INTERVAL}ms linear forwards`,
                        animationPlayState: isHovered ? "paused" : "running",
                      }
                    : { width: isDone ? "100%" : "0%" }
                }
              />
            </button>
          );
        })}
      </div>
    </Carousel.Root>
  );
}
