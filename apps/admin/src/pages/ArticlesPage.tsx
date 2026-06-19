import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import {
  Badge,
  Button,
  ButtonUtility,
  DataTable,
  Pagination,
  Popover,
  PopoverDialog,
  PopoverTrigger,
  cn,
  type DataTableColumn,
  type DataTableState,
} from "@repo/ui";
import { useAdminArticleFilterOptions } from "../hooks/use-admin-article-filter-options";
import { useAdminArticleList } from "../hooks/use-admin-article-list";
import { apiClient } from "../lib/api";
import { addToast } from "../lib/toast";
import {
  articleStatusText,
  articleStatusVariant,
  passThroughFilter,
  serverSideColumnSort,
  type ArticleRow,
  type ArticleStatus,
  type ArticleTableSort,
} from "./articles-page-data";

function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return <Badge variant={articleStatusVariant[status]}>{articleStatusText[status]}</Badge>;
}

interface ArticleDeleteButtonProps {
  article: ArticleRow;
  isDeleting: boolean;
  onConfirmDelete: (articleId: string) => Promise<void>;
}

function ArticleDeleteButton({ article, isDeleting, onConfirmDelete }: ArticleDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <ButtonUtility
        aria-label="删除文章"
        type="button"
        size="sm"
        color="tertiary"
        icon={
          <span className="text-destructive">
            <SvgIcon name="trash" size={18} />
          </span>
        }
        onClick={(event) => event.stopPropagation()}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      />
      <Popover placement="bottom end" offset={6} className="w-64">
        <PopoverDialog aria-label={`确认删除「${article.title}」`} className="p-3 outline-none">
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-foreground">
              确定删除这篇文章吗？文章将移入已删除状态。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" slot="close" isDisabled={isDeleting}>
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                isDisabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onPress={() => {
                  void onConfirmDelete(article.id)
                    .then(() => {
                      setIsOpen(false);
                    })
                    .catch(() => undefined);
                }}
              >
                {isDeleting ? "删除中..." : "删除"}
              </Button>
            </div>
          </div>
        </PopoverDialog>
      </Popover>
    </PopoverTrigger>
  );
}

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
        filter: {
          type: "single",
          defaultValue: "all",
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
    [categoryOptions, deletingArticleId, filters.categoryId, handleDeleteArticle, setCategoryId],
  );

  const listError = error ?? filterOptionsError;

  const toolbarActions = (
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
  );

  return (
    <div className="grid gap-6">
      <section className="min-w-0">
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SvgIcon name="pen" size={22} />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">文章管理</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          集中查看文章、按表头筛选排序，并从标题直接进入编辑页面。
        </p>
      </section>

      {listError ? (
        <p role="alert" className="text-sm text-destructive">
          {listError.message}
        </p>
      ) : null}

      <section className="grid gap-3" aria-label="文章列表工具栏">
        <DataTable
          aria-label="文章列表"
          items={rows}
          columns={columns}
          getRowId={(article) => article.id}
          actions={toolbarActions}
          showTotal={false}
          state={{
            searchValue: filters.search,
            filters: {
              category: filters.categoryId,
            },
            sort,
          }}
          onStateChange={handleTableStateChange}
          search={{
            value: filters.search,
            onChange: setSearch,
            placeholder: "搜索标题或摘要",
            match: passThroughFilter,
          }}
          total={pageData?.total}
          emptyText="暂无文章"
          isLoading={isLoading || isLoadingFilterOptions}
          maxHeightClassName={false}
          classNames={{ container: "shadow-sm" }}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">共 {pageData?.total ?? 0} 条</p>
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
