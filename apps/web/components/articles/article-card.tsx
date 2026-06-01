import Image from "next/image";
import Link from "next/link";
import { SvgIcon } from "@repo/icons";
import type { ArticleListItemResp } from "@repo/api";
import { ArticleCardStats } from "./article-card-stats";

interface ArticleCardProps {
  article: ArticleListItemResp;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const formattedDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article.created_at));

  const href = `/articles/${article.id}`;

  return (
    <article>
      {/* 封面图：hover 时内部图片放大 */}
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

      {/* 标题行：左侧标题 + 右侧外链图标，与标题第一行垂直对齐 */}
      <div className="mt-3 flex items-start gap-2">
        <h3 className="flex-1 font-semibold text-base md:text-lg line-clamp-2">
          <Link href={href} className="hover:text-muted-foreground transition-colors duration-200">
            {article.title}
          </Link>
        </h3>
        <Link
          href={href}
          aria-label="阅读文章"
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <SvgIcon name="arrow-up-right" size={20} />
        </Link>
      </div>

      {/* 分类标签（移至标题下方）*/}
      {article.category && (
        <div className="mt-2">
          <span className="inline-block bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs">
            {article.category.name}
          </span>
        </div>
      )}

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
