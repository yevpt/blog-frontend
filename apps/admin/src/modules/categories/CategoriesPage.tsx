import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, DataTable, type DataTableColumn, type DataTableEmptyState } from "@repo/ui";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminListCard } from "../../components/AdminListCard";
import { AdminListSummary } from "../../components/AdminListSummary";
import { adminFlushDataTableClassNames } from "../../lib/data-table-flush";
import { useClientTableQuery } from "../../lib/admin-list-query";
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { CategoryArticlesDrawer } from "./components/CategoryArticlesDrawer";
import { CategoryDeleteDialog } from "./components/CategoryDeleteDialog";
import { CategoryFormDialog } from "./components/CategoryFormDialog";
import { CategoryListToolbar } from "./components/CategoryListToolbar";
import { CategoryMobileList } from "./components/CategoryMobileList";
import { CategoryNameCell } from "./components/CategoryNameCell";
import { useCategoryList } from "./hooks/use-category-list";
import {
  filterAndSortCategoryRows,
  matchCategorySearch,
  suggestNextSeq,
  categoryTableQueryCodec,
  toCategoryCreateReq,
  toCategoryUpdateReq,
  type CategoryFormValues,
  type CategoryRow,
} from "./model";

type FormMode = "create" | "edit";

export function CategoriesPage() {
  const { rows, items, isLoading, error, refetch } = useCategoryList();
  const isMdScreen = useIsMdScreen();
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryRow | null>(null);
  const [articlesCategory, setArticlesCategory] = useState<CategoryRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    tableState,
    handleSearchChange,
    handleTableStateChange,
    resetListQuery,
    hasActiveListQuery,
  } = useClientTableQuery(categoryTableQueryCodec);

  const nextSeq = useMemo(() => suggestNextSeq(items), [items]);
  const totalArticles = useMemo(() => rows.reduce((sum, row) => sum + row.articleCount, 0), [rows]);
  const visibleRows = useMemo(
    () => filterAndSortCategoryRows(rows, tableState),
    [rows, tableState],
  );

  const openCreateDialog = useCallback(() => {
    setFormMode("create");
    setEditingCategory(null);
    setFormOpen(true);
  }, []);

  const openEditDialog = useCallback((category: CategoryRow) => {
    setFormMode("edit");
    setEditingCategory(category);
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: CategoryFormValues, mode: FormMode, categoryId?: string) => {
      setIsSubmitting(true);
      try {
        if (mode === "create") {
          await apiClient.categories.create(toCategoryCreateReq(values));
          addToast("分类已创建", "success");
        } else if (categoryId) {
          await apiClient.categories.update(Number(categoryId), toCategoryUpdateReq(values));
          addToast("分类已更新", "success");
        }
        setFormOpen(false);
        await refetch();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "保存失败，请稍后重试";
        addToast(message, "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refetch],
  );

  const handleDelete = useCallback(
    async (categoryId: string) => {
      setIsDeleting(true);
      try {
        await apiClient.categories.delete(Number(categoryId));
        addToast("分类已删除", "success");
        setDeletingCategory(null);
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "删除失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    [refetch],
  );

  const columns = useMemo<Array<DataTableColumn<CategoryRow>>>(
    () => [
      {
        id: "seq",
        header: "排序",
        width: "10%",
        minWidth: 72,
        className: "text-center text-muted-foreground tabular-nums",
        headerClassName: "text-center [&>div]:justify-center [&_span]:shrink-0",
        sort: {
          defaultDirection: "ascending",
          value: (category) => category.seq,
        },
        cell: (category) => category.seq,
      },
      {
        id: "name",
        header: "分类",
        isRowHeader: true,
        width: "18%",
        minWidth: 128,
        sort: {
          value: (category) => category.name,
        },
        cell: (category) => <CategoryNameCell category={category} />,
      },
      {
        id: "url",
        header: "别名",
        width: "14%",
        minWidth: 96,
        className: "truncate text-muted-foreground",
        cell: (category) => (category.url ? `/${category.url}` : "—"),
      },
      {
        id: "description",
        header: "描述",
        width: "28%",
        minWidth: 160,
        className: "truncate text-muted-foreground",
        cell: (category) => category.description || "—",
      },
      {
        id: "articleCount",
        header: "文章数",
        width: "12%",
        minWidth: 88,
        className: "text-right text-muted-foreground tabular-nums",
        headerClassName: "text-right [&>div]:justify-end [&_span]:shrink-0",
        sort: {
          value: (category) => category.articleCount,
        },
        cell: (category) => <span className="whitespace-nowrap">{category.articleCount}</span>,
      },
      {
        id: "actions",
        header: "操作",
        width: "18%",
        minWidth: 168,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (category) => (
          <div className="flex items-center justify-center gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onPress={() => setArticlesCategory(category)}
            >
              管理文章
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onPress={() => openEditDialog(category)}
            >
              编辑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onPress={() => setDeletingCategory(category)}
            >
              删除
            </Button>
          </div>
        ),
      },
    ],
    [openEditDialog],
  );

  const hasActiveSearch = hasActiveListQuery;
  const emptyState: DataTableEmptyState = hasActiveSearch
    ? {
        icon: "search",
        title: "未找到匹配的分类",
        description: "调整搜索关键词后再试。",
      }
    : {
        icon: "folder",
        title: "还没有分类",
        description: "创建第一个分类后，它会出现在首页 Tab 与文章筛选中。",
        action: (
          <Button size="sm" onPress={openCreateDialog}>
            <SvgIcon name="plus" size={15} />
            新建分类
          </Button>
        ),
      };

  const showArticleSummary = !isLoading && rows.length > 0;

  return (
    <div className="grid min-h-0 gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="分类管理"
        description="维护首页 Tab 顺序、分类封面与文章归类。"
        action={
          <Button size="sm" className="w-full shrink-0 sm:w-auto" onPress={openCreateDialog}>
            <SvgIcon name="plus" size={15} />
            新建分类
          </Button>
        }
      />

      <section className="flex min-h-0 flex-col" aria-label="分类列表">
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <AdminListCard className="md:min-h-[320px]">
          <CategoryListToolbar
            searchValue={tableState.searchValue}
            onSearchChange={handleSearchChange}
            canClear={hasActiveListQuery}
            onClear={resetListQuery}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="分类列表"
                items={rows}
                columns={columns}
                getRowId={(category) => category.id}
                state={tableState}
                onStateChange={handleTableStateChange}
                search={{
                  placeholder: "搜索分类名称、别名或描述…",
                  match: matchCategorySearch,
                }}
                showTotal={false}
                showToolbar={false}
                emptyState={emptyState}
                isLoading={isLoading}
                maxHeightClassName={false}
                embedded
                classNames={adminFlushDataTableClassNames}
              />
            ) : (
              <div className="h-full overflow-y-auto overscroll-y-contain">
                <CategoryMobileList
                  items={visibleRows}
                  isLoading={isLoading}
                  emptyState={emptyState}
                  onManageArticles={setArticlesCategory}
                  onEdit={openEditDialog}
                  onDelete={setDeletingCategory}
                />
              </div>
            )}
          </div>

          {showArticleSummary ? (
            <AdminListSummary
              visibleCount={visibleRows.length}
              secondary={`关联 ${totalArticles} 篇文章`}
            />
          ) : null}
        </AdminListCard>
      </section>

      <CategoryFormDialog
        mode={formMode}
        open={formOpen}
        category={editingCategory}
        nextSeq={nextSeq}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <CategoryDeleteDialog
        category={deletingCategory}
        isDeleting={isDeleting}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
      />

      <CategoryArticlesDrawer
        category={articlesCategory}
        isOpen={articlesCategory !== null}
        onClose={() => setArticlesCategory(null)}
        onArticlesChanged={refetch}
      />
    </div>
  );
}
