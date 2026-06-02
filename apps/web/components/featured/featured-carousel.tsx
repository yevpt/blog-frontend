"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Carousel } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { FeaturedPost } from "@/app/_mock/types";
import { FeaturedCarouselSlide } from "./featured-carousel-slide";

// CarouselApi：从 Carousel.Root 的 setApi prop 类型中推导，避免直接依赖 embla-carousel-react
type CarouselApi = Parameters<NonNullable<React.ComponentProps<typeof Carousel.Root>["setApi"]>>[0];

interface FeaturedCarouselProps {
  posts: FeaturedPost[];
}

export function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Embla select 事件同步 currentIndex
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // 自动播放（api 不可用时用 state fallback）
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
        setCurrentIndex((prev) => (prev + 1) % posts.length);
      }
    }, 4000);
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
      className="overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 图片区：Embla 控制横向滑动 */}
      <div className="relative aspect-video w-full">
        <Carousel.Content className="h-full">
          {posts.map((post, index) => (
            <Carousel.Item key={post.id}>
              <FeaturedCarouselSlide post={post} isLcpCandidate={index === 0} />
            </Carousel.Item>
          ))}
        </Carousel.Content>

        {/* 指示器叠层 */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2">
          {posts.map((post, index) => (
            <button
              key={post.id}
              onClick={() => handleIndicatorClick(index)}
              aria-label={`第 ${index + 1} 张，共 ${posts.length} 张`}
              aria-current={index === currentIndex ? "true" : undefined}
              className={`transition-colors duration-200 ${
                index === currentIndex ? "text-white" : "text-white/40 hover:text-white/80"
              }`}
            >
              <SvgIcon name="droplet-filled" size={12} />
            </button>
          ))}
        </div>
      </div>

      {/* 移动端文字区：cross-fade 由 currentIndex state 驱动 */}
      <div className="md:hidden relative h-44 overflow-hidden bg-card rounded-b-2xl">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className={`absolute inset-0 p-4 transition-opacity duration-500 ${
              index === currentIndex
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={index !== currentIndex}
          >
            <div className="flex items-start gap-2">
              <h2 className="flex-1 text-lg font-bold text-foreground line-clamp-2">
                {post.title}
              </h2>
              <Link
                href={post.href}
                aria-label="阅读文章"
                tabIndex={index === currentIndex ? 0 : -1}
                className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <SvgIcon name="arrow-up-right" size={20} />
              </Link>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
          </div>
        ))}
      </div>
    </Carousel.Root>
  );
}
