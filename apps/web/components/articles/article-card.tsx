"use client";

import Image from "next/image";
import Link from "next/link";
import type { ArticleListItemResp } from "@repo/api";
import { useLocale } from "@repo/hooks/locale";
import { formatDate } from "@/lib/format-time.ts";
import { ArticleCardStats } from "./article-card-stats";
import { ArticleDateCategory } from "./article-date-category";

interface ArticleCardProps {
  article: ArticleListItemResp;
  onLike?: (article: ArticleListItemResp) => void;
  likeDisabled?: boolean;
  onComment?: (article: ArticleListItemResp) => void;
}

export function ArticleCard({
  article,
  onLike,
  likeDisabled = false,
  onComment,
}: ArticleCardProps) {
  const { locale } = useLocale();
  const formattedDate = formatDate(article.created_at, locale);

  const href = `/articles/${article.id}`;

  return (
    // 外层 div 作为稳定的 hover 触发区，自身不位移，避免卡片上移后鼠标脱离触发区导致抖动
    <div className="group border-b border-border last:border-b-0 md:border-b-0">
      <article className="flex h-full flex-col overflow-hidden bg-transparent transition-shadow md:rounded-2xl md:border md:border-border md:bg-card md:shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)] md:group-hover:shadow-[0_4px_8px_rgba(0,0,0,0.07),0_14px_36px_rgba(0,0,0,0.08)]">
        {article.cover_img_url && (
          <Link
            href={href}
            className="block overflow-hidden md:rounded-none"
            aria-hidden
            tabIndex={-1}
          >
            <div className="relative aspect-video overflow-hidden rounded-xl md:rounded-none">
              <Image
                src={article.cover_img_url}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </Link>
        )}

        <div className="flex flex-1 flex-col px-0 py-3 pb-5 md:p-4">
          <h3 className="mb-2 text-lg font-bold leading-[1.45] tracking-[-0.02em] text-foreground line-clamp-2">
            <Link
              href={href}
              className="hover:text-muted-foreground transition-colors duration-200"
            >
              {article.title}
            </Link>
          </h3>

          <ArticleDateCategory
            dateTime={article.created_at}
            formattedDate={formattedDate}
            category={article.category?.name}
            className="mb-3"
          />

          {article.short_content && (
            <p className="mb-3.5 text-sm leading-[1.72] text-[var(--fg2)] line-clamp-3">
              {article.short_content}
            </p>
          )}

          <div className="mt-auto flex justify-end">
            <ArticleCardStats
              likes={article.like_count}
              comments={article.comment_count}
              liked={article.is_liked}
              likeDisabled={likeDisabled}
              onLike={() => onLike?.(article)}
              onComment={() => onComment?.(article)}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
