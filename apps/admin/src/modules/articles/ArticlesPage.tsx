import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import {
  Badge,
  Button,
  DataTable,
  Dropdown,
  Pagination,
  cn,
  type DataTableColumn,
  type DataTableState,
} from "@repo/ui";
import { ArticleDeleteButton } from "./components/ArticleDeleteButton";
import { ArticleListSearch } from "./components/ArticleListSearch";
import { ArticleStatusBadge } from "./components/ArticleStatusBadge";
import { useAdminArticleFilterOptions } from "./hooks/use-article-filter-options";
import { useAdminArticleList } from "./hooks/use-article-list";
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import { serverSideColumnSort, type ArticleRow, type ArticleTableSort } from "./model";

function isSameSort(a: ArticleTableSort, b?: DataTableState["sort"]) {
  return b?.column === a.column && b.direction === a.direction;
}

export function ArticlesPage() {
  const {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    sort,
    setSort,
    setSearch,
    setCategoryId,
    refetch,
  } = useAdminArticleList();
  const {
    categoryOptions,
    isLoading: isLoadingFilterOptions,
    error: filterOptionsError,
  } = useAdminArticleFilterOptions();
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const categorySelectItems = useMemo(
    () => categoryOptions.map((option) => ({ id: option.value, label: option.label })),
    [categoryOptions],
  );

  const handleDeleteArticle = useCallback(
    async (articleId: string) => {
      setDeletingArticleId(articleId);

      try {
        await apiClient.articles.deleteAdmin(Number(articleId));
        addToast("文章已删除", "success");
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "删除失败，请稍后重试", "error");
        throw err;
      } finally {
        setDeletingArticleId(null);
      }
    },
    [refetch],
  );

  const handleTableStateChange = useCallback(
    (nextState: DataTableState) => {
      if (!nextState.sort || isSameSort(sort, nextState.sort)) return;
      setSort({
        column: nextState.sort.column as ArticleTableSort["column"],
        direction: nextState.sort.direction,
      });
    },
    [setSort, sort],
  );

  const columns = useMemo<Array<DataTableColumn<ArticleRow>>>(
    () => [
      {
        id: "title",
        header: "标题",
        isRowHeader: true,
        width: "1fr",
        minWidth: 360,
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
        sort: serverSideColumnSort,
      },
      {
        id: "category",
        header: "分类",
        width: 148,
        className: "text-muted-foreground",
        cell: (article) => article.category,
        sort: serverSideColumnSort,
      },
      {
        id: "pinned",
        header: "推荐",
        width: 100,
        cell: (article) => (
          <Badge variant={article.isPinned ? "brand" : "secondary"}>
            {article.isPinned ? "已推荐" : "普通"}
          </Badge>
        ),
        sort: serverSideColumnSort,
      },
      {
        id: "createdAt",
        header: "创建时间",
        width: 130,
        className: "text-muted-foreground",
        cell: (article) => article.createdAt,
        sort: serverSideColumnSort,
      },
      {
        id: "updatedAt",
        header: "更新时间",
        width: 130,
        className: "text-muted-foreground",
        cell: (article) => article.updatedAt,
        sort: serverSideColumnSort,
      },
      {
        id: "actions",
        header: "操作",
        width: 80,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (article) => (
          <ArticleDeleteButton
            article={article}
            isDeleting={deletingArticleId === article.id}
            onConfirmDelete={handleDeleteArticle}
          />
        ),
      },
    ],
    [deletingArticleId, handleDeleteArticle],
  );

  const listError = error ?? filterOptionsError;
  const selectedCategoryLabel =
    categoryOptions.find((option) => option.value === filters.categoryId)?.label ?? "全部";
  const categoryChipText = filters.categoryId === "all" ? "分类" : `分类：${selectedCategoryLabel}`;

  return (
    <div className="grid h-[calc(100dvh-6.5rem)] min-h-0 grid-rows-[64px_auto_minmax(0,1fr)] overflow-hidden lg:h-[calc(100dvh-3rem)]">
      <section className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="truncate text-2xl font-semibold tracking-normal text-foreground">
          文章管理
        </h2>
        <Button href="/articles/new" size="sm" className="shrink-0">
          <SvgIcon name="plus" size={15} />
          新建
        </Button>
      </section>

      <section
        className="flex min-w-0 flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="文章列表筛选"
      >
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <Badge
            variant="secondary"
            className="h-8 shrink-0 rounded-full bg-foreground px-3 text-sm font-semibold text-background shadow-sm"
          >
            全部 {pageData?.total ?? 0}
          </Badge>
          <Dropdown.Root>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`筛选分类：${selectedCategoryLabel}`}
              className="h-8 shrink-0 rounded-full border-dashed border-border bg-background px-3 text-sm font-semibold shadow-none hover:border-primary/40 hover:bg-accent/60"
            >
              {categoryChipText}
              <SvgIcon name="chevron-down" size={14} />
            </Button>
            <Dropdown.Popover className="w-44">
              <Dropdown.Menu
                aria-label="筛选分类"
                selectionMode="single"
                selectedKeys={new Set([filters.categoryId])}
                onAction={(key) => setCategoryId(String(key))}
              >
                {categorySelectItems.map((item) => (
                  <Dropdown.Item key={item.id} id={item.id} label={item.label} />
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        </div>
        <div className="flex justify-end">
          <ArticleListSearch value={filters.search} onChange={setSearch} />
        </div>
      </section>

      <section
        className={cn(
          "grid min-h-0 gap-3 pt-3",
          listError ? "grid-rows-[auto_minmax(0,1fr)_auto]" : "grid-rows-[minmax(0,1fr)_auto]",
        )}
        aria-label="文章列表工具栏"
      >
        {listError ? (
          <p role="alert" className="text-sm text-destructive">
            {listError.message}
          </p>
        ) : null}
        <DataTable
          aria-label="文章列表"
          items={rows}
          columns={columns}
          getRowId={(article) => article.id}
          showTotal={false}
          state={{
            searchValue: filters.search,
            filters: {
              category: filters.categoryId,
            },
            sort,
          }}
          onStateChange={handleTableStateChange}
          total={pageData?.total}
          emptyText="暂无文章"
          isLoading={isLoading || isLoadingFilterOptions}
          maxHeightClassName={false}
          classNames={{
            root: "min-h-0 h-full",
            container: "min-h-0 h-full shadow-sm",
          }}
        />

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            共 {pageData?.total ?? 0} 条
          </p>
          {pageData && pageData.pages > 1 ? (
            <Pagination
              currentPage={page}
              totalPages={pageData.pages}
              onPageChange={setPage}
              className="justify-end"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
