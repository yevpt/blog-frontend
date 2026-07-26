import Link from "next/link";
import type { TagItemResp } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { filterVisibleCategories } from "@/lib/category-tabs";

interface TagsPageProps {
  tags: TagItemResp[];
}

export function TagsPage({ tags }: TagsPageProps) {
  // 与分类口径一致：空标签不出现在公开导航；按热度降序，热标签靠前
  const visibleTags = filterVisibleCategories(tags).sort(
    (a, b) => b.article_count - a.article_count,
  );

  return (
    <>
      {/* 单行头部：标题居左、统计居右，与分类页同一节奏 */}
      <FadeInUp className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
            文章标签
          </h1>
          {visibleTags.length > 0 && (
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
              共 {visibleTags.length} 个标签
            </p>
          )}
        </div>
      </FadeInUp>

      {visibleTags.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          还没有公开标签，敬请期待。
        </p>
      ) : (
        <FadeInUp delay={80}>
          <ul className="flex flex-wrap gap-2.5">
            {visibleTags.map((tag) => (
              <li key={tag.id}>
                <Link
                  href={`/tags/${tag.id}`}
                  className="inline-flex items-baseline rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors duration-200 hover:border-primary hover:text-primary"
                >
                  {tag.name}
                  <span className="ml-1.5 tabular-nums text-xs opacity-50">
                    {tag.article_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </FadeInUp>
      )}
    </>
  );
}
