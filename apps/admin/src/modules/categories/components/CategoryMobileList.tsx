import { SvgIcon } from "@repo/icons";
import { Button, cn, type DataTableEmptyState } from "@repo/ui";
import { CategoryNameCell } from "./CategoryNameCell";
import type { CategoryRow } from "../model";

interface CategoryMobileListProps {
  items: CategoryRow[];
  isLoading?: boolean;
  emptyState?: DataTableEmptyState;
  onManageArticles: (category: CategoryRow) => void;
  onEdit: (category: CategoryRow) => void;
  onDelete: (category: CategoryRow) => void;
}

function CategoryMobileListSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex animate-pulse items-start gap-3 px-3 py-3.5">
          <div className="size-7 rounded-lg bg-muted" />
          <div className="grid flex-1 gap-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-40 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryMobileEmptyState({ emptyState }: { emptyState?: DataTableEmptyState }) {
  const title = emptyState?.title ?? "暂无数据";
  const description = emptyState?.description ?? "添加数据后会显示在这里。";

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <SvgIcon name={emptyState?.icon ?? "folder"} size={28} className="text-muted-foreground" />
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{description}</p>
      {emptyState?.action ? <div className="mt-5">{emptyState.action}</div> : null}
    </div>
  );
}

export function CategoryMobileList({
  items,
  isLoading = false,
  emptyState,
  onManageArticles,
  onEdit,
  onDelete,
}: CategoryMobileListProps) {
  if (isLoading) {
    return <CategoryMobileListSkeleton />;
  }

  if (items.length === 0) {
    return <CategoryMobileEmptyState emptyState={emptyState} />;
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((category) => (
        <li key={category.id} className="px-3 py-3">
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-1.5 w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {category.seq}
            </span>

            <div className="min-w-0 flex-1">
              <CategoryNameCell category={category} />
              <p className="mt-1.5 truncate text-xs text-muted-foreground">
                {category.url ? `/${category.url}` : "未设置别名"} · {category.articleCount} 篇
              </p>
              {category.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {category.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-end gap-0.5 pl-8">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onPress={() => onManageArticles(category)}
            >
              管理文章
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onPress={() => onEdit(category)}
            >
              编辑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onPress={() => onDelete(category)}
            >
              删除
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
