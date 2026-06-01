import Image from "next/image";
import { Button } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";

interface FeaturedCarouselSlideProps {
  post: FeaturedPost;
  isActive: boolean;
  /** 首屏 LCP 候选：首张幻灯片始终 eager 预加载 */
  isLcpCandidate?: boolean;
}

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
      <div className="relative w-full h-full">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          className="object-cover"
          priority={isLcpCandidate}
          loading={isLcpCandidate ? "eager" : "lazy"}
        />

        {/* 桌面端：渐变遮罩 + 文字覆盖层 */}
        <div className="hidden md:block absolute inset-0 bg-linear-t from-black/80 via-black/30 to-transparent" />
        <div className="hidden md:block absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <span className="inline-block mb-3 px-3 py-1 text-xs font-medium text-white bg-white/20 rounded-full backdrop-blur-sm">
            {post.category}
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 line-clamp-2">
            {post.title}
          </h2>
          <p className="text-sm lg:text-base text-white/80 mb-4 line-clamp-2">{post.excerpt}</p>
          <Button
            href={post.href}
            tabIndex={isActive ? 0 : -1}
            variant="outline"
            size="sm"
            className="border-white/60 text-white bg-transparent hover:bg-white/20 hover:text-white hover:border-white"
          >
            阅读全文
          </Button>
        </div>
      </div>
    </div>
  );
}
