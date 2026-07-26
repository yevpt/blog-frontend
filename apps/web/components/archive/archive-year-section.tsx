import type { ArchiveYearGroup } from "./group-articles-by-year";
import { ArchiveArticleItem } from "./archive-article-item";

interface ArchiveYearSectionProps {
  group: ArchiveYearGroup;
}

export function ArchiveYearSection({ group }: ArchiveYearSectionProps) {
  return (
    <section className="relative pb-10 pl-8 last:pb-2 md:pl-10">
      {/* 时间轴竖线：从年份圆点中心画到分组底部，与下一年份自然衔接成一条连续时间线 */}
      <span aria-hidden className="absolute bottom-0 left-[8px] top-[15px] w-px bg-border" />

      <header className="relative mb-3 flex items-baseline gap-3">
        {/* 年份节点圆点：底色盖住竖线，描边用主题色 */}
        <span
          aria-hidden
          className="absolute -left-[29px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full border-[2.5px] border-primary bg-background md:-left-[37px]"
        />
        <h2 className="text-xl font-extrabold tracking-[-0.03em] text-foreground md:text-2xl">
          {group.year}
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {group.articles.length} 篇
        </span>
      </header>

      <ul className="space-y-0.5">
        {group.articles.map((article) => (
          <ArchiveArticleItem key={article.id} article={article} />
        ))}
      </ul>
    </section>
  );
}
