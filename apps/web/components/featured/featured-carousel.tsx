"use client";

import { useState, useEffect, useRef } from "react";
import type { FeaturedPost } from "@/app/_mock/types";
import { FeaturedCarouselSlide } from "./featured-carousel-slide";
import { FeaturedCarouselIndicators } from "./featured-carousel-indicators";

interface FeaturedCarouselProps {
  posts: FeaturedPost[];
}

// 自动轮播外壳：每 4 秒切换幻灯片，悬停暂停
export function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  // 用 ref 保存 interval 以便精确清理
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 悬停状态变化时管理 interval
  useEffect(() => {
    if (isHovered) {
      // 悬停时清除自动播放
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 非悬停时启动自动播放
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

  return (
    <div
      role="region"
      aria-label="推荐文章"
      className="relative overflow-hidden rounded-2xl aspect-video w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 幻灯片层：绝对定位，opacity fade 切换 */}
      {posts.map((post, index) => (
        <FeaturedCarouselSlide
          key={post.id}
          post={post}
          isActive={index === currentIndex}
          isLcpCandidate={index === 0}
        />
      ))}

      {/* 指示器：覆盖在图片上方底部居中 */}
      <div className="absolute bottom-4 left-0 right-0 z-10">
        <FeaturedCarouselIndicators
          count={posts.length}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
        />
      </div>
    </div>
  );
}
