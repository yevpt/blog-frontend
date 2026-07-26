import type { ArticleListItemResp } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { PageSectionHeader } from "@/components/common/page-section-header";
import { groupArticlesByYear } from "./group-articles-by-year";
import { ArchiveYearSection } from "./archive-year-section";

interface ArchivePageProps {
  articles: ArticleListItemResp[];
}

/** 年份分组入场动画的延迟上限，避免年份多时队尾动画过晚 */
const MAX_STAGGER_DELAY = 400;

export function ArchivePage({ articles }: ArchivePageProps) {
  const yearGroups = groupArticlesByYear(articles);
  const oldestYear = yearGroups[yearGroups.length - 1]?.year;

  return (
    <>
      <FadeInUp className="mb-10">
        <PageSectionHeader label="文章归档" title="时光有迹可循" />
        <p className="mt-3 text-sm text-muted-foreground">
          {articles.length > 0 && oldestYear
            ? `共 ${articles.length} 篇文章，记录始于 ${oldestYear} 年`
            : "这里会按时间收集所有文章"}
        </p>
      </FadeInUp>

      {yearGroups.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          还没有公开文章，敬请期待。
        </p>
      ) : (
        <div>
          {yearGroups.map((group, index) => (
            <FadeInUp key={group.year} delay={Math.min(index * 80, MAX_STAGGER_DELAY)}>
              <ArchiveYearSection group={group} />
            </FadeInUp>
          ))}
        </div>
      )}
    </>
  );
}
