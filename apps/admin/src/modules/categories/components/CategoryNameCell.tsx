import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import type { CategoryRow } from "../model";
import { CategoryIconPreview } from "./CategoryIconPreview";

interface CategoryNameCellProps {
  category: CategoryRow;
}

export function CategoryNameCell({ category }: CategoryNameCellProps) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg",
          "border border-border/70 bg-muted/50",
        )}
      >
        {category.icon ? (
          <CategoryIconPreview url={category.icon} alt="" className="size-4 object-contain" />
        ) : (
          <SvgIcon name="folder" size={14} className="text-muted-foreground" />
        )}
      </span>
      <span className="truncate font-medium text-foreground">{category.name}</span>
    </span>
  );
}
