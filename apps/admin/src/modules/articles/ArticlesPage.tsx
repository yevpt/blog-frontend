import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import {
  Badge,
  Button,
  DataTable,
  Pagination,
  cn,
  type DataTableColumn,
  type DataTableEmptyState,
  type DataTableState,
} from "@repo/ui";
import { ArticleDeleteButton } from "./components/ArticleDeleteButton";
import { ArticleListSearch } from "./components/ArticleListSearch";
import { ArticleStatusBadge } from "./components/ArticleStatusBadge";
import { useAdminArticleFilterOptions } from "./hooks/use-article-filter-options";
import { useAdminArticleList } from "./hooks/use-article-list";
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import {
  passThroughFilter,
  serverSideColumnSort,
  type ArticleRow,
  type ArticleTableSort,
} from "./model";

function isSameSort(a: ArticleTableSort | undefined, b?: DataTableState["sort"]) {
  if (!a || !b) return false;
  return b.column === a.column && b.direction === a.direction;
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
      if (!nextState.sort) {
        if (sort) setSort(undefined);
        return;
      }

      if (isSameSort(sort, nextState.sort)) return;
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
        headerAction: <ArticleListSearch value={filters.search} onChange={setSearch} />,
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
        width: 128,
        className: "text-muted-foreground",
        cell: (article) => article.category,
        sort: serverSideColumnSort,
        filter: {
          type: "single",
          value: filters.categoryId,
          options: categoryOptions,
          onChange: setCategoryId,
          match: passThroughFilter,
        },
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
    [
      deletingArticleId,
      handleDeleteArticle,
      filters.search,
      filters.categoryId,
      categoryOptions,
      setSearch,
      setCategoryId,
    ],
  );

  const listError = error ?? filterOptionsError;
  const totalCount = pageData?.total ?? 0;
  const totalPages = pageData?.pages ?? 0;
  const showFooterTotal = totalCount > 0;
  const showPagination = totalPages > 1;
  const hasActiveArticleFilters = filters.search.trim().length > 0 || filters.categoryId !== "all";
  const articleEmptyState: DataTableEmptyState = hasActiveArticleFilters
    ? {
        icon: "search",
        title: "未找到匹配的文章",
        description: "调整搜索关键词或分类筛选后再试。",
      }
    : {
        icon: "folder",
        title: "还没有文章",
        description: "新建第一篇文章后，它会显示在这里。",
        action: (
          <Button href="/articles/new" size="sm">
            <SvgIcon name="plus" size={15} />
            新建文章
          </Button>
        ),
      };

  return (
    <div className="grid max-h-[calc(100dvh-6.5rem)] min-h-0 grid-rows-[64px_minmax(0,1fr)] overflow-hidden lg:-mt-6 lg:max-h-[calc(100dvh-1.5rem)]">
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
          emptyState={articleEmptyState}
          isLoading={isLoading || isLoadingFilterOptions}
          maxHeightClassName={false}
          classNames={{
            root: "min-h-0 h-full",
            container: "min-h-0 h-full shadow-sm",
            headerAction: "min-w-0 flex-1 shrink justify-end",
          }}
        />

        {showFooterTotal || showPagination ? (
          <div className="flex shrink-0 items-center justify-between gap-3 pt-3">
            {showFooterTotal ? (
              <p className="whitespace-nowrap text-sm text-muted-foreground">共 {totalCount} 条</p>
            ) : (
              <span aria-hidden="true" />
            )}
            {showPagination ? (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="justify-end border-t-0 pt-0 md:pt-0"
              />
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
