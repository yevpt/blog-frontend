import { Link } from "react-router-dom";
import { SvgIcon } from "@repo/icons";
import { Badge, cn, type DataTableEmptyState } from "@repo/ui";
import { ArticleDeleteButton } from "./ArticleDeleteButton";
import { ArticleStatusBadge } from "./ArticleStatusBadge";
import type { ArticleRow } from "../model";

interface ArticleMobileListProps {
  items: ArticleRow[];
  isLoading?: boolean;
  emptyState?: DataTableEmptyState;
  deletingArticleId: string | null;
  onConfirmDelete: (articleId: string) => Promise<void>;
}

function ArticleMobileListSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex animate-pulse flex-col gap-2 px-4 py-3.5">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ArticleMobileEmptyState({ emptyState }: { emptyState?: DataTableEmptyState }) {
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

export function ArticleMobileList({
  items,
  isLoading = false,
  emptyState,
  deletingArticleId,
  onConfirmDelete,
}: ArticleMobileListProps) {
  if (isLoading) {
    return <ArticleMobileListSkeleton />;
  }

  if (items.length === 0) {
    return <ArticleMobileEmptyState emptyState={emptyState} />;
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((article) => (
        <li key={article.id} className="flex items-start gap-2.5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link
              to={`/articles/${article.id}/edit`}
              className={cn(
                "block text-sm font-medium text-foreground underline-offset-4",
                "hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {article.title}
            </Link>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{article.excerpt}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ArticleStatusBadge status={article.status} />
              <span className="text-xs text-muted-foreground">{article.category}</span>
              {article.isPinned ? (
                <Badge variant="brand" className="text-[10px]">
                  已推荐
                </Badge>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              更新 {article.updatedAt} · 创建 {article.createdAt}
            </p>
          </div>

          <div className="flex shrink-0 items-center">
            <ArticleDeleteButton
              article={article}
              isDeleting={deletingArticleId === article.id}
              onConfirmDelete={onConfirmDelete}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
