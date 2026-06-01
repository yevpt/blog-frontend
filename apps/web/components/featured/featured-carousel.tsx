"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";
import { FeaturedCarouselSlide } from "./featured-carousel-slide";
import { FeaturedCarouselIndicators } from "./featured-carousel-indicators";

interface FeaturedCarouselProps {
  posts: FeaturedPost[];
}

export function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isHovered) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 4000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHovered, posts.length]);

  if (posts.length === 0) return null;

  const activePost = posts[currentIndex];

  return (
    <div
      role="region"
      aria-label="推荐文章"
      className="overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 图片区：固定 16:9，各幻灯片在此叠层切换 */}
      <div className="relative aspect-video w-full">
        {posts.map((post, index) => (
          <FeaturedCarouselSlide
            key={post.id}
            post={post}
            isActive={index === currentIndex}
            isLcpCandidate={index === 0}
          />
        ))}
        <div className="absolute bottom-4 left-0 right-0 z-10">
          <FeaturedCarouselIndicators
            count={posts.length}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
          />
        </div>
      </div>

      {/* 移动端文字区：图片下方，直接读当前幻灯片数据，无淡入淡出 */}
      <div className="md:hidden p-4 bg-card">
        <span className="inline-block mb-2 px-3 py-1 text-xs font-medium text-secondary-foreground bg-secondary rounded-full">
          {activePost.category}
        </span>
        <h2 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{activePost.title}</h2>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{activePost.excerpt}</p>
        <Button href={activePost.href} variant="outline" size="sm">
          阅读全文
        </Button>
      </div>
    </div>
  );
}
