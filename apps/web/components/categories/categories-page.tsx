import type { CategoryTabItem } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { filterVisibleCategories } from "@/lib/category-tabs";
import { CategoryCard } from "./category-card";

interface CategoriesPageProps {
  categories: CategoryTabItem[];
}

/** 分类卡片入场动画的延迟上限，避免分类多时队尾动画过晚 */
const MAX_STAGGER_DELAY = 400;

export function CategoriesPage({ categories }: CategoriesPageProps) {
  // 与首页 Tab 口径一致：空分类不出现在公开导航中
  const visibleCategories = filterVisibleCategories(categories);
  const totalArticles = visibleCategories.reduce((sum, c) => sum + c.article_count, 0);

  return (
    <>
      {/* 单行头部：标题居左、统计居右，避免 label/标题/统计多层堆叠 */}
      <FadeInUp className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
            文章分类
          </h1>
          {visibleCategories.length > 0 && (
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
              共 {visibleCategories.length} 个分类 · {totalArticles} 篇
            </p>
          )}
        </div>
      </FadeInUp>

      {visibleCategories.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          还没有公开分类，敬请期待。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {visibleCategories.map((category, index) => (
            <FadeInUp key={category.id} delay={Math.min(index * 50, MAX_STAGGER_DELAY)}>
              <CategoryCard category={category} />
            </FadeInUp>
          ))}
        </div>
      )}
    </>
  );
}
