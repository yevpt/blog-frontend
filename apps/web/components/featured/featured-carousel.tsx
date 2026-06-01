"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SvgIcon } from "@repo/icons";
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

      {/* 移动端文字区：固定高度 + 各幻灯片内容叠层淡入淡出，防止高度跳动 */}
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
    </div>
  );
}
