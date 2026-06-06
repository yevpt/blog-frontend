import { cn } from "@repo/ui";
import { getCategoryColorClass } from "@/lib/category-colors";

interface ArticleDateCategoryProps {
  dateTime: string;
  formattedDate: string;
  category?: string;
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
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${getCategoryColorClass(category)}`} />
          {category}
        </span>
      )}
    </div>
  );
}
