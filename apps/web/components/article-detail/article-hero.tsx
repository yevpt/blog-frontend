"use client";

import Image from "next/image";
import type { ArticleDetailResp } from "@repo/api";
import { useLocale } from "@repo/hooks";
import { formatDate } from "@/lib/format-time.ts";
import { ArticleDateCategory } from "@/components/articles/article-date-category";

interface ArticleHeroProps {
  article: ArticleDetailResp;
}

function estimateReadingMinutes(content: string): number {
  const len = content.replace(/[^\w一-龥]/g, "").length;
  return Math.max(1, Math.ceil(len / 300));
}

export function ArticleHero({ article }: ArticleHeroProps) {
  const readingMin = estimateReadingMinutes(article.content);
  const { locale } = useLocale();
  const formattedDate = formatDate(article.created_at, locale);

  return (
    <div className="mx-auto max-w-[720px]">
      {article.cover_img_url && (
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl">
          <Image
            src={article.cover_img_url}
            alt={article.title}
            fill
            className="object-cover object-center"
            priority
          />
        </div>
      )}

      <h1 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-3xl lg:text-[2rem]">
        {article.title}
      </h1>

      {article.user && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          {article.user.avatar_url && (
            <Image
              src={article.user.avatar_url}
              alt={article.user.nickname ?? article.user.username}
              width={24}
              height={24}
              className="rounded-full object-cover"
            />
          )}
          <span className="font-medium text-foreground">
            {article.user.nickname ?? article.user.username}
          </span>
          {article.user.mark && (
            <>
              <span aria-hidden>·</span>
              <span>{article.user.mark}</span>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-6 text-sm text-muted-foreground">
        <ArticleDateCategory
          dateTime={article.created_at}
          formattedDate={formattedDate}
          category={article.category?.name}
        />
        <span aria-hidden>·</span>
        <span>{readingMin} 分钟阅读</span>
        <span aria-hidden>·</span>
        <span>{article.read_count.toLocaleString()} 阅读</span>
      </div>
    </div>
  );
}
