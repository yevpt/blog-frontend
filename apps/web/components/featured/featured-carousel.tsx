"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button, Carousel } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";
import { resolveFeaturedPostForViewport } from "@/lib/article-cover";
import { FeaturedCarouselSlide } from "./featured-carousel-slide";

// Derive CarouselApi type from Carousel.Root props to avoid a direct embla dependency.
type CarouselApi = Parameters<NonNullable<React.ComponentProps<typeof Carousel.Root>["setApi"]>>[0];

interface FeaturedCarouselProps {
  posts: FeaturedPost[];
}

// ────────────────────────────────────────────────
// 桌面端：纯 CSS translateY 垂直翻页，无 Embla
// ────────────────────────────────────────────────
function FeaturedCarouselDesktop({ posts }: { posts: FeaturedPost[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % posts.length);
  }, [posts.length]);

  useEffect(() => {
    if (isHovered || posts.length <= 1) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    timeoutRef.current = setTimeout(advanceSlide, 5000);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [advanceSlide, currentIndex, isHovered, posts.length]);

  const handleIndicatorClick = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl h-[50vh] min-h-[380px] max-h-[520px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="推荐文章"
    >
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="absolute inset-0 transition-transform duration-700 ease-in-out"
          style={{ transform: `translateY(${(index - currentIndex) * 100}%)` }}
          role="group"
          aria-roledescription="slide"
        >
          <FeaturedCarouselSlide post={post} isActive={index === currentIndex} />
        </div>
      ))}

      {/* 右侧竖向胶囊指示器 */}
      {posts.length > 1 && (
        <div className="absolute right-5 top-1/2 z-[5] flex -translate-y-1/2 flex-col items-center gap-3">
          {posts.map((post, index) => (
            <Button
              key={post.id}
              variant="ghost"
              onPress={() => handleIndicatorClick(index)}
              data-testid="hero-progress-button"
              aria-label={`第 ${index + 1} 张，共 ${posts.length} 张`}
              aria-current={index === currentIndex ? "true" : undefined}
              className="group flex h-5 w-5 items-center justify-center p-0"
            >
              <span
                className={`block rounded-full transition-all duration-500 ${
                  index === currentIndex ? "bg-foreground" : "bg-[var(--fg3)]"
                }`}
                style={{
                  width: 8,
                  height: index === currentIndex ? 24 : 8,
                }}
              />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// 移动端：Embla 水平轮播
// ────────────────────────────────────────────────
function FeaturedCarouselMobile({ posts }: { posts: FeaturedPost[] }) {
  const mobilePosts = posts.map((post) => resolveFeaturedPostForViewport(post, "mobile"));
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const advanceSlide = useCallback(() => {
    if (api) {
      const nextIndex = (api.selectedScrollSnap() + 1) % posts.length;
      api.scrollTo(nextIndex);
      return;
    }
    setCurrentIndex((prev) => (prev + 1) % posts.length);
  }, [api, posts.length]);

  useEffect(() => {
    if (isHovered || posts.length <= 1) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    timeoutRef.current = setTimeout(advanceSlide, 5000);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [advanceSlide, currentIndex, isHovered, posts.length]);

  const handleIndicatorClick = useCallback(
    (index: number) => {
      api?.scrollTo(index);
      setCurrentIndex(index);
    },
    [api],
  );

  const mobileIndicators =
    posts.length > 1 ? (
      <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-2.5 py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.24)] backdrop-blur-md">
        {posts.map((post, index) => (
          <Button
            key={post.id}
            variant="ghost"
            onPress={() => handleIndicatorClick(index)}
            aria-label={`切换至第 ${index + 1} 张`}
            aria-current={index === currentIndex ? "true" : undefined}
            className="flex h-5 w-5 items-center justify-center rounded-full p-0"
          >
            <span
              className="block rounded-full bg-white"
              style={{
                opacity: index === currentIndex ? 1 : 0.5,
                width: index === currentIndex ? 18 : 6,
                height: 6,
                // 仅激活时播放扩展动画；失活立即归位，杜绝两端同时出现宽点的视觉问题
                transition:
                  index === currentIndex ? "width 300ms ease-out, opacity 200ms ease" : "none",
              }}
            />
          </Button>
        ))}
      </div>
    ) : null;

  return (
    <Carousel.Root
      opts={{
        loop: true,
        watchDrag: (_emblaApi, event) => {
          const target = event.target;
          return (
            target instanceof Element &&
            target.closest("[data-carousel-background-drag='true']") !== null
          );
        },
      }}
      setApi={setApi}
      aria-label="推荐文章"
      className="h-[100svh] overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full w-full">
        <Carousel.Content className="h-full">
          {mobilePosts.map((post, index) => (
            <Carousel.Item key={post.id} className="h-full">
              <FeaturedCarouselSlide post={post} isActive={index === currentIndex} />
            </Carousel.Item>
          ))}
        </Carousel.Content>
        {mobileIndicators && (
          <div
            className="absolute bottom-5 left-0 right-0 z-20 flex justify-center md:hidden"
            data-carousel-no-drag="true"
          >
            {mobileIndicators}
          </div>
        )}
      </div>
    </Carousel.Root>
  );
}

// ────────────────────────────────────────────────
// 主导出：桌面垂直 + 移动水平
// ────────────────────────────────────────────────
export function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  if (posts.length === 0) return null;

  return (
    <>
      {/* 移动端：全屏，不受 max-width 约束 */}
      <div className="md:hidden">
        <FeaturedCarouselMobile posts={posts} />
      </div>
      {/* 桌面端（md+）：保持原有容器约束 */}
      <div className="hidden md:block mx-auto max-w-[1120px] px-5 pt-20">
        <FeaturedCarouselDesktop posts={posts} />
      </div>
    </>
  );
}
