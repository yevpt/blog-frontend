import { memo } from "react";
import Link from "next/link";
import type { CategoryTabItem } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { LoadingImage } from "@/components/common/loading-image";
import { getCategoryColorClass } from "@/lib/category-colors";

interface CategoryCardProps {
  category: CategoryTabItem;
}

/** 左侧视觉块：封面缩略图 → 图标 → 色块首字，三级降级 */
function CategoryVisual({ category }: { category: CategoryTabItem }) {
  if (category.cover_img_url) {
    return (
      <LoadingImage
        src={category.cover_img_url}
        alt={category.name}
        fill
        className="object-cover"
        sizes="48px"
        skeletonClassName="rounded-xl"
        fallbackClassName="rounded-xl"
      />
    );
  }

  if (category.icon) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-secondary">
        <span className="relative h-6 w-6 overflow-hidden">
          <LoadingImage
            src={category.icon}
            alt=""
            fill
            unoptimized
            className="object-contain"
            sizes="24px"
          />
        </span>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={`flex h-full w-full items-center justify-center text-base font-bold text-white ${getCategoryColorClass(category.name)}`}
    >
      {category.name.charAt(0)}
    </div>
  );
}

export const CategoryCard = memo(function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${category.id}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 transition-all duration-200 hover:border-primary hover:shadow-card"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <CategoryVisual category={category} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="mb-0.5 truncate text-[15px] font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
          {category.name}
        </h3>
        <p className="truncate text-xs leading-relaxed text-muted-foreground">
          {category.description || "这个分类还没有简介"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted-foreground">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {category.article_count}
          </span>{" "}
          篇
        </span>
        <SvgIcon
          name="chevron-right"
          size={14}
          className="text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
    </Link>
  );
});
