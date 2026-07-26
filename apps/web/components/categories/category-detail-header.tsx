import Link from "next/link";
import type { CategoryTabItem } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { LoadingImage } from "@/components/common/loading-image";

interface CategoryDetailHeaderProps {
  category: CategoryTabItem;
}

export function CategoryDetailHeader({ category }: CategoryDetailHeaderProps) {
  return (
    <FadeInUp className="mb-8">
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
      >
        <SvgIcon name="arrow-back" size={13} />
        全部分类
      </Link>

      {/* 标题行横排：图标 + 名称 + 计数居左，订阅居右，避免多层纵向堆叠 */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          {category.icon && (
            <span className="relative h-6 w-6 shrink-0 self-center overflow-hidden rounded-lg">
              <LoadingImage
                src={category.icon}
                alt=""
                fill
                unoptimized
                className="object-contain"
                sizes="24px"
                skeletonClassName="rounded-lg"
                fallbackClassName="rounded-lg"
              />
            </span>
          )}
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
            {category.name}
          </h1>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {category.article_count} 篇
          </span>
        </div>

        <a
          href={`/categories/${category.id}/feed.xml`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-primary"
        >
          <SvgIcon name="rss" size={12} />
          订阅
        </a>
      </div>

      {category.description && (
        <p className="mt-2 text-sm leading-[1.72] text-muted-foreground">{category.description}</p>
      )}
    </FadeInUp>
  );
}
