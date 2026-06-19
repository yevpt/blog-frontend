import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SvgIcon } from "@repo/icons";
import { Badge, Button, DataTable, cn, type DataTableColumn } from "@repo/ui";
import {
  articleStatusText,
  articleStatusVariant,
  articles,
  categoryFilterOptions,
  pinnedFilterOptions,
  statusFilterOptions,
  tagFilterOptions,
  type ArticleRow,
  type ArticleStatus,
} from "./articles-page-data";

function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return <Badge variant={articleStatusVariant[status]}>{articleStatusText[status]}</Badge>;
}

export function ArticlesPage() {
  const columns = useMemo<Array<DataTableColumn<ArticleRow>>>(
    () => [
      {
        id: "title",
        header: "标题",
        isRowHeader: true,
        width: 430,
        className: "max-w-[360px]",
        cell: (article) => (
          <>
            <Link
              to={`/articles/${article.id}/edit`}
              className={cn(
                "block truncate font-medium text-foreground underline-offset-4",
                "hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {article.title}
            </Link>
            <p className="mt-1 truncate text-xs text-muted-foreground">{article.excerpt}</p>
          </>
        ),
      },
      {
        id: "status",
        header: "状态",
        width: 120,
        cell: (article) => <ArticleStatusBadge status={article.status} />,
        filter: {
          type: "single",
          defaultValue: "all",
          options: statusFilterOptions,
          match: (article, value) => value === "all" || article.status === value,
        },
      },
      {
        id: "category",
        header: "分类",
        width: 110,
        className: "text-muted-foreground",
        cell: (article) => article.category,
        filter: {
          type: "single",
          defaultValue: "all",
          options: categoryFilterOptions,
          match: (article, value) => value === "all" || article.category === value,
        },
      },
      {
        id: "tags",
        header: "标签",
        width: 150,
        cell: (article) => (
          <div className="flex min-w-0 gap-1">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="shrink-0">
                {tag}
              </Badge>
            ))}
          </div>
        ),
        filter: {
          type: "single",
          defaultValue: "all",
          options: tagFilterOptions,
          match: (article, value) => value === "all" || article.tags.includes(value),
        },
      },
      {
        id: "pinned",
        header: "置顶",
        width: 100,
        cell: (article) => (
          <Badge variant={article.isPinned ? "brand" : "secondary"}>
            {article.isPinned ? "已置顶" : "普通"}
          </Badge>
        ),
        filter: {
          type: "single",
          defaultValue: "all",
          options: pinnedFilterOptions,
          match: (article, value) =>
            value === "all" ||
            (value === "pinned" && article.isPinned) ||
            (value === "normal" && !article.isPinned),
        },
      },
      {
        id: "updatedAt",
        header: "更新时间",
        width: 130,
        className: "text-muted-foreground",
        cell: (article) => article.updatedAt,
        sort: {
          defaultDirection: "descending",
          value: (article) => article.updatedAt,
        },
      },
      {
        id: "delete",
        header: "删除",
        width: 80,
        className: "text-right",
        headerClassName: "text-right",
        cell: () => (
          <Button type="button" variant="ghost" size="sm" onPress={() => undefined}>
            删除
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SvgIcon name="pen" size={22} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">文章管理</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            集中查看文章、按表头筛选排序，并从标题直接进入编辑页面。
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button href="/articles/pinned" variant="outline" className="w-full sm:w-auto">
            <SvgIcon name="arrow-up" size={18} />
            置顶管理
          </Button>
          <Button href="/articles/new" className="w-full sm:w-auto">
            <SvgIcon name="plus" size={18} />
            新建文章
          </Button>
        </div>
      </section>

      <section className="grid gap-3" aria-label="文章列表工具栏">
        <DataTable
          aria-label="文章列表"
          items={articles}
          columns={columns}
          getRowId={(article) => article.id}
          search={{
            placeholder: "搜索标题、摘要或作者",
            match: (article, keyword) =>
              [article.title, article.excerpt, article.category, ...article.tags]
                .join(" ")
                .toLowerCase()
                .includes(keyword.toLowerCase()),
          }}
          emptyText="暂无文章"
          maxHeightClassName={false}
          classNames={{ container: "shadow-sm" }}
        />
      </section>
    </div>
  );
}
