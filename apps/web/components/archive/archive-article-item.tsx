import Link from "next/link";
import type { ArticleListItemResp } from "@repo/api";
import { formatMonthDay } from "@/lib/format-time";
import { getCategoryColorClass } from "@/lib/category-colors";

interface ArchiveArticleItemProps {
  article: ArticleListItemResp;
}

export function ArchiveArticleItem({ article }: ArchiveArticleItemProps) {
  const categoryName = article.category?.name;

  return (
    <li className="group relative">
      {/* 时间轴节点：压在竖线上，行 hover 时点亮 */}
      <span
        aria-hidden
        className="absolute -left-[27px] top-[14px] h-[7px] w-[7px] rounded-full bg-border transition-colors duration-200 group-hover:bg-primary md:-left-[35px]"
      />
      <div className="flex items-baseline gap-3 py-1.5">
        <time
          dateTime={article.created_at}
          className="w-10 shrink-0 text-[13px] tabular-nums text-muted-foreground"
        >
          {formatMonthDay(article.created_at)}
        </time>
        <Link
          href={`/articles/${article.id}`}
          className="min-w-0 flex-1 text-[15px] leading-[1.6] text-foreground transition-colors duration-200 hover:text-muted-foreground"
        >
          {article.title}
        </Link>
        {categoryName && (
          <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${getCategoryColorClass(categoryName)}`} />
            {categoryName}
          </span>
        )}
      </div>
    </li>
  );
}
