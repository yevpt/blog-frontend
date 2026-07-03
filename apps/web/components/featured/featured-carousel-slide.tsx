"use client";

import React from "react";
import Link from "next/link";
import { cn, Button } from "@repo/ui";
import { useLocale } from "@repo/hooks/locale";
import type { FeaturedPost } from "@/app/_mock/types";
import { LoadingImage } from "@/components/common/loading-image";
import { formatDate } from "../../lib/format-time";
import { getCategoryColorClass } from "@/lib/category-colors";
import { isGifImageUrl } from "@/lib/markdown-image-optimizer";

interface FeaturedCarouselSlideProps {
  post: FeaturedPost;
  /** Whether this slide is currently visible (for staggered text animation). */
  isActive: boolean;
  /** 仅图片区骨架（桌面首帧占位），右侧文案正常展示 */
  showImageSkeleton?: boolean;
  /**
   * 是否挂载图片：懒加载策略下，尚未被访问过的 slide 保持骨架不挂载 `<LoadingImage>`；
   * 一旦访问过就应恒为 true，避免翻页离开时图片被卸载、下次翻回又变回骨架闪烁。
   */
  shouldRenderImage?: boolean;
}

/**
 * Dual-mode slide:
 * - Mobile: full-screen overlay — image fills viewport, bottom gradient, text floats at bottom.
 * - Desktop (md+): two-column flex — left image, right text panel; moved vertically by CSS translateY.
 *
 * Text enters with staggered opacity + translateX transitions driven by `isActive`.
 */
export function FeaturedCarouselSlide({
  post,
  isActive,
  showImageSkeleton = false,
  shouldRenderImage = true,
}: FeaturedCarouselSlideProps) {
  const { locale } = useLocale();
  const formattedDate = formatDate(post.date, locale);

  return (
    <div className="relative h-full w-full md:flex md:flex-row md:gap-4 md:py-4">
      {/* ── 图片：移动端绝对定位铺满，桌面端作为 flex 子项 ── */}
      <div
        data-carousel-background-drag="true"
        className="absolute inset-0 overflow-hidden md:relative md:inset-auto md:h-full md:w-auto md:flex-1 md:shrink-0 md:rounded-xl md:shadow-md"
      >
        {showImageSkeleton || !shouldRenderImage ? (
          <div
            data-testid="loading-image-skeleton"
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden loading-image-skeleton"
          />
        ) : (
          <LoadingImage
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            defer={false}
            className={cn("object-cover", "transition-transform duration-[6000ms] ease-out")}
            style={{
              transform: "scale(1.05)",
              willChange: "transform",
            }}
            fallbackUnoptimized
            unoptimized={isGifImageUrl(post.coverImage) || undefined}
            sizes="(max-width: 768px) 100vw, 55vw"
          />
        )}
        <div className="absolute inset-0 bg-black/10" />
        {/* 移动端底部渐变叠加层 */}
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.30) 42%, transparent 68%)",
          }}
        />
      </div>

      {/* ── 文字区：移动端绝对定位于底部，桌面端作为 flex 子项 ── */}
      {/*
        pointer-events-none on mobile: touch events in this wrapper fall through to the image
        behind it, so the entire visible image area (including the transparent gap above the
        text) stays draggable. pointer-events-auto is restored on md+ for desktop interaction.
      */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none md:pointer-events-auto md:relative md:inset-auto md:z-auto md:h-full md:w-[42%] md:flex-none">
        {/* Mobile-only visual gap above text content — replaces pt-12 on the inner div.
            pointer-events-none (inherited from parent) lets swipe gestures pass through. */}
        <div className="h-12 md:hidden" aria-hidden="true" />
        <div
          data-carousel-no-drag="true"
          onPointerDownCapture={(e) => e.stopPropagation()}
          className="pointer-events-auto flex flex-col gap-3.5 px-5 pb-24 cursor-auto select-text sm:px-8 sm:pb-28 md:h-full md:justify-between md:gap-0 md:px-12 md:py-8 lg:px-16"
        >
          {/* 日期 + 分类 */}
          <div
            className="flex items-center gap-2.5 text-[13px] font-medium tracking-wide text-white/65 transition-[opacity,transform] md:text-muted-foreground"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "translateX(0)" : "translateX(20px)",
              transitionDuration: isActive ? "600ms" : "250ms",
              transitionDelay: isActive ? "0ms" : "0ms",
            }}
          >
            <span>{formattedDate}</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${getCategoryColorClass(post.category)}`}
              />
              {post.category}
            </span>
          </div>

          {/* 标题 */}
          <h2
            className="line-clamp-2 text-[20px] font-bold leading-[1.2] tracking-tight text-white transition-[opacity,transform] md:line-clamp-none md:text-[clamp(22px,2.4vw,36px)] md:text-foreground"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "translateX(0)" : "translateX(24px)",
              transitionDuration: isActive ? "700ms" : "250ms",
              transitionDelay: isActive ? "160ms" : "0ms",
            }}
          >
            <Link
              href={post.href}
              className="hover:text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              {post.title}
            </Link>
          </h2>

          {/* 摘要 */}
          <p
            className="line-clamp-3 text-[13px] leading-relaxed text-white/65 transition-[opacity,transform] md:line-clamp-none md:max-w-[400px] md:text-[14px] md:leading-[1.75] md:text-muted-foreground"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "translateX(0)" : "translateX(24px)",
              transitionDuration: isActive ? "700ms" : "250ms",
              transitionDelay: isActive ? "280ms" : "0ms",
            }}
          >
            {post.excerpt}
          </p>

          {/* CTA */}
          <div
            className="transition-[opacity,transform]"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "translateX(0)" : "translateX(24px)",
              transitionDuration: isActive ? "700ms" : "250ms",
              transitionDelay: isActive ? "400ms" : "0ms",
            }}
          >
            <Button
              href={post.href}
              variant="outline"
              size="sm"
              aria-label={`阅读全文：${post.title}`}
              className="h-10 rounded-full border-white/45 bg-transparent px-6 text-[13px] font-semibold text-white shadow-sm transition-colors md:border-border md:bg-card md:text-foreground md:hover:border-primary md:hover:bg-primary/10 md:hover:text-primary"
            >
              阅读全文 →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
