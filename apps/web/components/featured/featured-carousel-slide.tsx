import Image from "next/image";
import { Button } from "@repo/ui";
import type { FeaturedPost } from "@/app/_mock/types";

interface FeaturedCarouselSlideProps {
  post: FeaturedPost;
  /** 首屏 LCP 候选：首张幻灯片始终 eager 预加载 */
  isLcpCandidate?: boolean;
}

export function FeaturedCarouselSlide({
  post,
  isLcpCandidate = false,
}: FeaturedCarouselSlideProps) {
  return (
    <div className="relative w-full h-full">
      {/* 图片层 */}
      <Image
        src={post.coverImage}
        alt={post.title}
        fill
        className="object-cover"
        priority={isLcpCandidate}
        loading={isLcpCandidate ? "eager" : "lazy"}
      />

      {/* 顶部遮罩：保护 Navbar 可读性 */}
      <div className="absolute inset-x-0 top-0 h-[130px] bg-gradient-to-b from-black/40 to-transparent z-[1]" />

      {/* 底部遮罩：内容区可读性 */}
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/88 via-black/50 to-transparent z-[1]" />

      {/* 紫色斜向色调 */}
      <div
        className="absolute inset-0 z-[2] opacity-[0.22]"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, transparent 100%)",
        }}
      />

      {/* 内容层 */}
      <div className="absolute inset-x-0 bottom-[64px] z-10 px-6 pb-8 md:px-12 md:pb-10">
        {/* pill 标签 */}
        <span className="inline-flex items-center mb-4 px-3 py-1 text-xs font-bold tracking-widest text-accent bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
          ✦ 精选推荐
        </span>

        {/* 标题 */}
        <h2
          className="font-black text-white leading-tight mb-3 line-clamp-2 max-sm:line-clamp-2"
          style={{
            fontSize: "clamp(20px, 3vw, 40px)",
            letterSpacing: "-0.04em",
          }}
        >
          {post.title}
        </h2>

        {/* 摘要 */}
        <p
          className="text-[14px] leading-[1.7] mb-5 line-clamp-3 max-sm:line-clamp-2"
          style={{ color: "rgba(255,255,255,0.52)" }}
        >
          {post.excerpt}
        </p>

        {/* CTA 按钮 */}
        <Button
          href={post.href}
          variant="outline"
          size="sm"
          className="border-white/60 text-white bg-white/10 backdrop-blur-sm hover:bg-white/25 hover:border-white hover:text-white"
        >
          阅读全文
        </Button>
      </div>

      {/* 底部液态玻璃渐变（覆盖进度条区域下方，过渡到页面背景） */}
      <div
        className="absolute inset-x-0 bottom-0 h-[64px] z-[4] pointer-events-none"
        style={{
          background: "transparent",
          backdropFilter: "blur(14px) saturate(140%)",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          maskImage: "linear-gradient(to top, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, black 60%, transparent 100%)",
        }}
      />
    </div>
  );
}
