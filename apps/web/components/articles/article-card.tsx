import Image from "next/image";
import Link from "next/link";
import type { ArticleListItemResp } from "@repo/api";
import { ArticleCardStats } from "./article-card-stats";

interface ArticleCardProps {
  article: ArticleListItemResp;
}

// 单篇文章卡片，无边框，通过间距分隔
export function ArticleCard({ article }: ArticleCardProps) {
  // 日期格式化：中文长格式，如"2025年11月20日"
  const formattedDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article.created_at));

  const href = `/articles/${article.id}`;

  return (
    <article>
      {/* 封面图：16:9 比例，overflow-hidden，hover 时内部图片放大 */}
      {article.cover_img_url && (
        <Link
          href={href}
          className="block overflow-hidden rounded-xl group"
          aria-hidden
          tabIndex={-1}
        >
          <div className="relative aspect-video">
            <Image
              src={article.cover_img_url}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </Link>
      )}

      {/* 分类标签 */}
      {article.category && (
        <div className="mt-3">
          <span className="inline-block bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs">
            {article.category.name}
          </span>
        </div>
      )}

      {/* 文章标题 */}
      <h3 className="mt-2 font-semibold text-base md:text-lg line-clamp-2">
        <Link href={href} className="hover:text-muted-foreground transition-colors duration-200">
          {article.title}
        </Link>
      </h3>

      {/* 文章摘要 */}
      {article.short_content && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{article.short_content}</p>
      )}

      {/* 底部：发布日期 + 统计数据 */}
      <div className="mt-3 flex justify-between items-center">
        <time dateTime={article.created_at} className="text-xs text-muted-foreground">
          {formattedDate}
        </time>
        <ArticleCardStats
          views={article.read_count}
          likes={article.like_count}
          comments={article.comment_count}
        />
      </div>
    </article>
  );
}
