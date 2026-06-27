"use client";

import Link from "next/link";
import type { ArticleDetailResp } from "@repo/api";
import { useLocale } from "@repo/hooks";
import { LoadingImage } from "@/components/common/loading-image";
import { UserAvatar } from "@/components/common/user-avatar";
import { useActiveArticle } from "@/store/use-active-article";
import { useImageViewer } from "@/store/use-image-viewer";
import { formatDate } from "@/lib/format-time.ts";
import { mapArticleMusicToSyncInput } from "@/lib/article-music";
import { ArticleDateCategory } from "@/components/articles/article-date-category";
import { ArticleMusicBar } from "./article-music-bar";

interface ArticleHeroProps {
  article: ArticleDetailResp;
}

function estimateReadingMinutes(content: string): number {
  const len = content.replace(/[^\w一-龥]/g, "").length;
  return Math.max(1, Math.ceil(len / 300));
}

export function ArticleHero({ article }: ArticleHeroProps) {
  const readingMin = estimateReadingMinutes(article.content);
  const readCount = useActiveArticle((state) => state.readCount) || article.read_count;
  const likeCount = useActiveArticle((state) => state.likeCount) || article.like_count;
  const { locale } = useLocale();
  const openViewer = useImageViewer((s) => s.open);
  const formattedDate = formatDate(article.created_at, locale);
  const musicPreview = mapArticleMusicToSyncInput(article.music);
  const authorName = article.user ? (article.user.nickname ?? article.user.username) : undefined;
  const authorProfileHref = article.user?.id ? `/users/${article.user.id}` : undefined;

  return (
    <div className="mx-auto max-w-[720px]">
      {article.cover_img_url && (
        <button
          type="button"
          aria-label="查看封面大图"
          onClick={() => openViewer([{ src: article.cover_img_url!, alt: article.title }], 0)}
          className="group relative mb-8 block aspect-video w-full cursor-zoom-in overflow-hidden rounded-2xl"
        >
          <LoadingImage
            src={article.cover_img_url}
            alt={article.title}
            fill
            className="object-cover object-center"
            fallbackUnoptimized
            sizes="(max-width: 768px) 100vw, 720px"
          />
        </button>
      )}

      <h1 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-3xl lg:text-[2rem]">
        {article.title}
      </h1>

      {article.user && authorName && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href={authorProfileHref ?? "#"}
            className="shrink-0"
            aria-label={`查看${authorName}的主页`}
            onClick={(e) => {
              if (!authorProfileHref) e.preventDefault();
            }}
          >
            <UserAvatar
              src={article.user.avatar_url}
              userId={article.user.id}
              name={authorName}
              size="sm"
              className="h-6 w-6"
            />
          </Link>
          <Link
            href={authorProfileHref ?? "#"}
            className="font-medium text-foreground"
            onClick={(e) => {
              if (!authorProfileHref) e.preventDefault();
            }}
          >
            {authorName}
          </Link>
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
        <span>{String(readCount)} 阅读</span>
        <span aria-hidden className="hidden md:inline">
          ·
        </span>
        <span className="hidden md:inline">{String(likeCount)} 点赞</span>
      </div>

      <ArticleMusicBar preview={musicPreview} />
    </div>
  );
}
