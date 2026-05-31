import Image from "next/image";
import Link from "next/link";
import { Button } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";

interface FeaturedCarouselSlideProps {
  post: FeaturedPost;
  isActive: boolean;
  /** 首屏 LCP 候选：首张幻灯片始终 eager 预加载，不随轮播切换 */
  isLcpCandidate?: boolean;
}

// 单张幻灯片，纯展示组件，无需 'use client'
export function FeaturedCarouselSlide({
  post,
  isActive,
  isLcpCandidate = false,
}: FeaturedCarouselSlideProps) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isActive}
    >
      {/* 封面图：相对定位容器，fill 模式 */}
      <div className="relative w-full h-full">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          className="object-cover"
          priority={isLcpCandidate}
          loading={isLcpCandidate ? "eager" : "lazy"}
        />

        {/* 底部渐变遮罩 */}
        <div className="absolute inset-0 bg-linear-t from-black/80 via-black/30 to-transparent" />

        {/* 文字内容区：绝对定位在底部 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          {/* 分类标签 */}
          <span className="inline-block mb-3 px-3 py-1 text-xs font-medium text-white bg-white/20 rounded-full backdrop-blur-sm">
            {post.category}
          </span>

          {/* 文章标题 */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
            {post.title}
          </h2>

          {/* 文章摘要 */}
          <p className="text-sm md:text-base text-white/80 mb-4 line-clamp-2">{post.excerpt}</p>

          {/* 阅读全文按钮：使用 outline variant，白色边框 */}
          <Link href={post.href} tabIndex={isActive ? 0 : -1}>
            <Button
              variant="outline"
              size="sm"
              className="border-white/60 text-white bg-transparent hover:bg-white/20 hover:text-white hover:border-white"
            >
              阅读全文
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
