import Link from "next/link";
import { cn } from "@repo/ui";
import { getCategoryColorClass } from "@/lib/category-colors";

interface ArticleDateCategoryProps {
  dateTime: string;
  formattedDate: string;
  category?: { id: number; name: string };
  className?: string;
}

export function ArticleDateCategory({
  dateTime,
  formattedDate,
  category,
  className,
}: ArticleDateCategoryProps) {
  return (
    <div className={cn("flex items-center gap-2.5 text-sm text-muted-foreground", className)}>
      <time dateTime={dateTime}>{formattedDate}</time>
      {category && (
        <Link
          href={`/categories/${category.id}`}
          className="flex items-center gap-1.5 transition-colors duration-200 hover:text-foreground"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${getCategoryColorClass(category.name)}`}
          />
          {category.name}
        </Link>
      )}
    </div>
  );
}
