"use client";

import Link from "next/link";
import type { ArticleListItemResp } from "@repo/api";
import { useLocale } from "@repo/hooks/locale";
import { LoadingImage } from "@/components/common/loading-image";
import { formatDate } from "@/lib/format-time.ts";
import { ArticleCardStats } from "./article-card-stats";
import { ArticleDateCategory } from "./article-date-category";

interface ArticleCardProps {
  article: ArticleListItemResp;
  /** 首屏卡片设为 true，使封面图 eager 加载，避免 LCP 警告 */
  priority?: boolean;
  onLike?: (article: ArticleListItemResp) => void;
  likeDisabled?: boolean;
  onComment?: (article: ArticleListItemResp) => void;
}

export function ArticleCard({
  article,
  priority = false,
  onLike,
  likeDisabled = false,
  onComment,
}: ArticleCardProps) {
  const { locale } = useLocale();
  const formattedDate = formatDate(article.created_at, locale);

  const href = `/articles/${article.id}`;

  return (
    // 外层 div 作为稳定的 hover 触发区，自身不位移，避免卡片上移后鼠标脱离触发区导致抖动
    <div className="group">
      <article className="flex h-full flex-col overflow-hidden bg-transparent transition-shadow md:rounded-2xl md:bg-card md:shadow-card md:group-hover:shadow-card-hover">
        {article.cover_img_url && (
          <Link
            href={href}
            className="block overflow-hidden md:px-3 md:pt-3"
            aria-hidden
            tabIndex={-1}
          >
            <div className="group/img relative aspect-video overflow-hidden rounded-xl">
              <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover/img:scale-[1.06]">
                <LoadingImage
                  src={article.cover_img_url}
                  alt={article.title}
                  fill
                  priority={priority}
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
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
            <p className="mb-3.5 text-sm leading-[1.72] text-(--fg2) line-clamp-3">
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
