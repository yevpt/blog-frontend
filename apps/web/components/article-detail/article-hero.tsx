import Image from "next/image";
import type { ArticleDetailResp } from "@repo/api";

interface ArticleHeroProps {
  article: ArticleDetailResp;
}

function estimateReadingMinutes(content: string): number {
  const len = content.replace(/[^\w一-龥]/g, "").length;
  return Math.max(1, Math.ceil(len / 300));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function ArticleHero({ article }: ArticleHeroProps) {
  const readingMin = estimateReadingMinutes(article.content);

  return (
    <div
      className={`relative w-full h-[380px] md:h-[480px] overflow-hidden${
        !article.cover_img_url ? " bg-gradient-to-br from-muted to-muted/60" : ""
      }`}
    >
      {article.cover_img_url && (
        <Image
          src={article.cover_img_url}
          alt={article.title}
          fill
          className="object-cover object-center"
          priority
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 px-5">
        <div className="mx-auto max-w-[720px] pb-8">
          {article.category && (
            <span className="mb-3 inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
              {article.category.name}
            </span>
          )}
          <h1 className="mb-3 text-2xl font-extrabold leading-tight tracking-tight text-white md:text-3xl">
            {article.title}
          </h1>
          <p className="mb-2 text-sm text-white/60">
            {formatDate(article.created_at)} · {readingMin} 分钟阅读
          </p>
          <div className="flex gap-4 text-sm text-white/50">
            <span>{article.read_count.toLocaleString()} 阅读</span>
            <span>{article.like_count} 点赞</span>
            <span>{article.comment_count} 评论</span>
          </div>
        </div>
      </div>
    </div>
  );
}
