import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminListCard } from "../../components/AdminListCard";
import { AdminListSummary } from "../../components/AdminListSummary";
import { adminFlushDataTableClassNames } from "../../lib/data-table-flush";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { ArticleDeleteButton } from "./components/ArticleDeleteButton";
import { ArticleListToolbar } from "./components/ArticleListToolbar";
import { ArticleMobileList } from "./components/ArticleMobileList";
import { ArticleStatusBadge } from "./components/ArticleStatusBadge";
import { RecommendSortDialog } from "./components/RecommendSortDialog";
import { useAdminArticleFilterOptions } from "./hooks/use-article-filter-options";
import { useAdminArticleList } from "./hooks/use-article-list";
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import {
  buildArticleEditorLinkState,
  passThroughFilter,
  serverSideColumnSort,
  type ArticleRow,
  type ArticleTableSort,
} from "./model";

function isSameSort(a?: DataTableState["sort"], b?: DataTableState["sort"]) {
  if (!a || !b) return false;
  return b.column === a.column && b.direction === a.direction;
}

export function ArticlesPage() {
  const [searchParams] = useSearchParams();
  const listSearch = searchParams.toString();
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
    resetListQuery,
    hasActiveListQuery,
    refetch,
  } = useAdminArticleList();
  const {
    categoryOptions,
    isLoading: isLoadingFilterOptions,
    error: filterOptionsError,
  } = useAdminArticleFilterOptions();
  const isMdScreen = useIsMdScreen();
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [recommendSortOpen, setRecommendSortOpen] = useState(false);

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
        width: "34%",
        minWidth: 240,
        className: "min-w-0 whitespace-normal",
        cell: (article) => (
          <>
            <Link
              to={`/articles/${article.id}/edit`}
              state={buildArticleEditorLinkState(listSearch)}
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
        width: "12%",
        minWidth: 96,
        cell: (article) => <ArticleStatusBadge status={article.status} />,
        sort: serverSideColumnSort,
      },
      {
        id: "category",
        header: "分类",
        width: "14%",
        minWidth: 96,
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
        width: "12%",
        minWidth: 88,
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
        width: "14%",
        minWidth: 112,
        className: "text-muted-foreground tabular-nums",
        cell: (article) => article.createdAt,
        sort: serverSideColumnSort,
      },
      {
        id: "updatedAt",
        header: "更新时间",
        width: "14%",
        minWidth: 112,
        className: "text-muted-foreground tabular-nums",
        cell: (article) => article.updatedAt,
        sort: serverSideColumnSort,
      },
      {
        id: "actions",
        header: "操作",
        width: "10%",
        minWidth: 80,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (article) => (
          <div className="flex items-center justify-center">
            <ArticleDeleteButton
              article={article}
              isDeleting={deletingArticleId === article.id}
              onConfirmDelete={handleDeleteArticle}
            />
          </div>
        ),
      },
    ],
    [
      deletingArticleId,
      handleDeleteArticle,
      filters.categoryId,
      categoryOptions,
      setCategoryId,
      listSearch,
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
        icon: "pen",
        title: "还没有文章",
        description: "新建第一篇文章后，它会显示在这里。",
        action: (
          <Button href="/articles/new" size="sm">
            <SvgIcon name="plus" size={15} />
            新建文章
          </Button>
        ),
      };

  const tableState: DataTableState = {
    searchValue: filters.search,
    filters: {
      category: filters.categoryId,
    },
    sort,
  };

  return (
    <div className="grid min-h-0 gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="文章管理"
        description="集中查看文章、按表头筛选排序，并从标题直接进入编辑页面。"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              size="sm"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onPress={() => setRecommendSortOpen(true)}
            >
              <SvgIcon name="arrow-up" size={15} />
              推荐排序
            </Button>
            <Button href="/articles/new" size="sm" className="w-full shrink-0 sm:w-auto">
              <SvgIcon name="plus" size={15} />
              新建文章
            </Button>
          </div>
        }
      />

      <RecommendSortDialog
        open={recommendSortOpen}
        onClose={() => setRecommendSortOpen(false)}
        onSaved={() => {
          addToast("推荐排序已保存", "success");
          void refetch();
        }}
      />

      <section className="flex min-h-0 flex-col" aria-label="文章列表">
        {listError ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {listError.message}
          </p>
        ) : null}

        <AdminListCard className="md:min-h-[320px]">
          <ArticleListToolbar
            searchValue={filters.search}
            onSearchChange={setSearch}
            categoryId={filters.categoryId}
            categoryOptions={categoryOptions}
            onCategoryChange={setCategoryId}
            canClear={hasActiveListQuery}
            onClear={resetListQuery}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="文章列表"
                items={rows}
                columns={columns}
                getRowId={(article) => article.id}
                state={tableState}
                onStateChange={handleTableStateChange}
                showTotal={false}
                showToolbar={false}
                emptyState={articleEmptyState}
                isLoading={isLoading || isLoadingFilterOptions}
                maxHeightClassName={false}
                embedded
                classNames={adminFlushDataTableClassNames}
              />
            ) : (
              <div className="h-full overflow-y-auto overscroll-y-contain">
                <ArticleMobileList
                  items={rows}
                  isLoading={isLoading || isLoadingFilterOptions}
                  emptyState={articleEmptyState}
                  deletingArticleId={deletingArticleId}
                  onConfirmDelete={handleDeleteArticle}
                  listSearch={listSearch}
                />
              </div>
            )}
          </div>

          {showFooterTotal || showPagination ? (
            <div className="flex shrink-0 flex-col gap-1 border-t border-border/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              {showFooterTotal ? (
                <AdminListSummary visibleCount={totalCount} className="border-0" />
              ) : null}
              {showPagination ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className="w-full border-t-0 px-4 py-2 sm:w-auto sm:shrink-0 sm:justify-end sm:py-2.5"
                />
              ) : null}
            </div>
          ) : null}
        </AdminListCard>
      </section>
    </div>
  );
}
