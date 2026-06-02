"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ArticleListItemResp } from "@repo/api";
import { ArticleCardStats } from "./article-card-stats";

interface ArticleCardProps {
  article: ArticleListItemResp;
  onCommentClick?: (meta: { title: string; type: string }) => void;
}

export function ArticleCard({ article, onCommentClick }: ArticleCardProps) {
  const [liked, setLiked] = useState(false);

  const formattedDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article.created_at));

  const href = `/articles/${article.id}`;

  const handleCommentClick = () => {
    onCommentClick?.({
      title: article.title,
      type: article.category?.name ?? "文章",
    });
  };

  return (
    <article className="flex flex-col bg-card rounded-xl overflow-hidden max-sm:rounded-none max-sm:shadow-none max-sm:border-0 max-sm:border-b max-sm:border-border">
      {/* 封面图：hover 时图片放大 */}
      {article.cover_img_url && (
        <Link href={href} className="block overflow-hidden" aria-hidden tabIndex={-1}>
          <div className="relative aspect-video">
            <Image
              src={article.cover_img_url}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-[1.06]"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </Link>
      )}

      {/* 卡片体 */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* 分类（标题上方） */}
        {article.category && (
          <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
            {article.category.name}
          </span>
        )}

        {/* 标题 */}
        <h3 className="text-base font-bold leading-snug line-clamp-2">
          <Link href={href} className="hover:text-accent transition-colors duration-200">
            {article.title}
          </Link>
        </h3>

        {/* 摘要（3 行截断） */}
        {article.short_content && (
          <p
            className="text-[13px] text-muted-foreground line-clamp-3"
            style={{ lineHeight: "1.72" }}
          >
            {article.short_content}
          </p>
        )}

        {/* 底部行：日期（左）+ 统计（右） */}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <time dateTime={article.created_at} className="text-xs text-muted-foreground">
            {formattedDate}
          </time>
          <ArticleCardStats
            likes={article.like_count}
            comments={article.comment_count}
            liked={liked}
            onLikeToggle={() => setLiked((v) => !v)}
            onCommentClick={handleCommentClick}
          />
        </div>
      </div>
    </article>
  );
}
