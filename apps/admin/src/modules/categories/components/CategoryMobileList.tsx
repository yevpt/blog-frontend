import { SvgIcon } from "@repo/icons";
import { cn, type DataTableEmptyState } from "@repo/ui";
import { AdminRowAction, AdminRowActions } from "../../../components/AdminRowAction";
import { CategoryNameCell } from "./CategoryNameCell";
import { CategoryDeleteButton } from "./CategoryDeleteButton";
import type { CategoryRow } from "../model";

interface CategoryMobileListProps {
  items: CategoryRow[];
  isLoading?: boolean;
  emptyState?: DataTableEmptyState;
  onManageArticles: (category: CategoryRow) => void;
  onEdit: (category: CategoryRow) => void;
  deletingCategoryId: string | null;
  onConfirmDelete: (categoryId: string) => Promise<void>;
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

  const icon = emptyState?.icon;
  const iconNode =
    icon === false ? null : typeof icon === "string" ? (
      <SvgIcon name={icon} size={28} className="text-muted-foreground" />
    ) : (
      (icon ?? <SvgIcon name="folder" size={28} className="text-muted-foreground" />)
    );

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {iconNode}
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
  deletingCategoryId,
  onConfirmDelete,
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

          <AdminRowActions className="mt-2.5 pl-8">
            <AdminRowAction
              type="button"
              className="h-8"
              onPress={() => onManageArticles(category)}
            >
              管理文章
            </AdminRowAction>
            <AdminRowAction type="button" className="h-8" onPress={() => onEdit(category)}>
              编辑
            </AdminRowAction>
            <CategoryDeleteButton
              category={category}
              isDeleting={deletingCategoryId === category.id}
              onConfirm={onConfirmDelete}
              className="h-8"
            />
          </AdminRowActions>
        </li>
      ))}
    </ul>
  );
}
