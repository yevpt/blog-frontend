import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import {
  Button,
  DataTable,
  type DataTableColumn,
  type DataTableEmptyState,
  type DataTableState,
} from "@repo/ui";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminListCard } from "../../components/AdminListCard";
import { AdminListSummary } from "../../components/AdminListSummary";
import { adminFlushDataTableClassNames } from "../../lib/data-table-flush";
import { TagDeleteDialog } from "./components/TagDeleteDialog";
import { TagFormDialog } from "./components/TagFormDialog";
import { TagListToolbar } from "./components/TagListToolbar";
import { TagMobileList } from "./components/TagMobileList";
import { TagNameCell } from "./components/TagNameCell";
import { useTagList } from "./hooks/use-tag-list";
import { useIsMdScreen } from "./hooks/use-is-md-screen";
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import {
  filterAndSortTagRows,
  matchTagSearch,
  suggestNextSeq,
  toTagBasicUpdateReq,
  toTagCreateReq,
  type TagFormValues,
  type TagRow,
} from "./model";

type FormMode = "create" | "edit";

export function TagsPage() {
  const { rows, items, isLoading, error, refetch } = useTagList();
  const isMdScreen = useIsMdScreen();
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagRow | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableState, setTableState] = useState<DataTableState>({
    searchValue: "",
    filters: {},
    sort: { column: "seq", direction: "ascending" },
  });

  const nextSeq = useMemo(() => suggestNextSeq(items), [items]);
  const totalArticles = useMemo(() => rows.reduce((sum, row) => sum + row.articleCount, 0), [rows]);
  const visibleRows = useMemo(() => filterAndSortTagRows(rows, tableState), [rows, tableState]);

  const openCreateDialog = useCallback(() => {
    setFormMode("create");
    setEditingTag(null);
    setFormOpen(true);
  }, []);

  const openEditDialog = useCallback((tag: TagRow) => {
    setFormMode("edit");
    setEditingTag(tag);
    setFormOpen(true);
  }, []);

  const handleSearchChange = useCallback((searchValue: string) => {
    setTableState((current) => ({ ...current, searchValue }));
  }, []);

  const handleSubmit = useCallback(
    async (values: TagFormValues, mode: FormMode, tagId?: string) => {
      setIsSubmitting(true);
      try {
        if (mode === "create") {
          await apiClient.tags.create(toTagCreateReq(values));
          addToast("标签已创建", "success");
        } else if (tagId) {
          await apiClient.tags.update(Number(tagId), toTagBasicUpdateReq(values));
          addToast("标签已更新", "success");
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

  const handleDeleteTag = useCallback(
    async (tagId: string) => {
      setIsDeleting(true);
      try {
        await apiClient.tags.delete(Number(tagId));
        addToast("标签已删除", "success");
        setDeletingTag(null);
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

  const columns = useMemo<Array<DataTableColumn<TagRow>>>(
    () => [
      {
        id: "seq",
        header: "排序",
        width: "14%",
        minWidth: 88,
        className: "text-center text-muted-foreground tabular-nums",
        headerClassName:
          "text-center [&>div]:justify-center [&>div]:flex-nowrap [&>div>span]:whitespace-nowrap",
        sort: {
          defaultDirection: "ascending",
          value: (tag) => tag.seq,
        },
        cell: (tag) => tag.seq,
      },
      {
        id: "name",
        header: "标签",
        width: "24%",
        minWidth: 128,
        className: "min-w-0 whitespace-normal",
        sort: {
          value: (tag) => tag.name,
        },
        cell: (tag) => <TagNameCell tag={tag} />,
      },
      {
        id: "url",
        header: "别名",
        width: "18%",
        minWidth: 88,
        className: "truncate text-muted-foreground",
        cell: (tag) => (tag.url ? `/${tag.url}` : "—"),
      },
      {
        id: "articleCount",
        header: "文章数",
        width: "18%",
        minWidth: 96,
        className: "text-right text-muted-foreground tabular-nums",
        headerClassName:
          "text-right [&>div]:justify-end [&>div]:flex-nowrap [&>div>span]:whitespace-nowrap",
        sort: {
          value: (tag) => tag.articleCount,
        },
        cell: (tag) => <span className="whitespace-nowrap">{tag.articleCount}</span>,
      },
      {
        id: "actions",
        header: "操作",
        width: "26%",
        minWidth: 112,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (tag) => (
          <div className="flex items-center justify-center gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onPress={() => openEditDialog(tag)}
            >
              编辑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onPress={() => setDeletingTag(tag)}
            >
              删除
            </Button>
          </div>
        ),
      },
    ],
    [openEditDialog],
  );

  const hasActiveSearch = tableState.searchValue.trim().length > 0;
  const emptyState: DataTableEmptyState = hasActiveSearch
    ? {
        icon: "search",
        title: "未找到匹配的标签",
        description: "调整搜索关键词后再试。",
      }
    : {
        icon: "tag",
        title: "还没有标签",
        description: "创建第一个标签后，它可用于文章归类与前台检索。",
        action: (
          <Button size="sm" onPress={openCreateDialog}>
            <SvgIcon name="plus" size={15} />
            新建标签
          </Button>
        ),
      };

  const showArticleSummary = !isLoading && rows.length > 0;

  return (
    <div className="grid min-h-0 gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="标签管理"
        description="整理标签字典与文章关联，保持内容检索清晰。"
        action={
          <Button size="sm" className="w-full shrink-0 sm:w-auto" onPress={openCreateDialog}>
            <SvgIcon name="plus" size={15} />
            新建标签
          </Button>
        }
      />

      <section className="flex min-h-0 flex-col" aria-label="标签列表">
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <AdminListCard className="md:min-h-[320px]">
          <TagListToolbar
            searchValue={tableState.searchValue}
            onSearchChange={handleSearchChange}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="标签列表"
                items={rows}
                columns={columns}
                getRowId={(tag) => tag.id}
                state={tableState}
                onStateChange={setTableState}
                search={{
                  placeholder: "搜索标签名称或别名…",
                  match: matchTagSearch,
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
                <TagMobileList
                  items={visibleRows}
                  isLoading={isLoading}
                  emptyState={emptyState}
                  onEdit={openEditDialog}
                  onDelete={setDeletingTag}
                />
              </div>
            )}
          </div>

          {showArticleSummary ? (
            <AdminListSummary
              visibleCount={visibleRows.length}
              secondary={`关联 ${totalArticles} 篇公开文章`}
            />
          ) : null}
        </AdminListCard>
      </section>

      <TagFormDialog
        mode={formMode}
        open={formOpen}
        tag={editingTag}
        nextSeq={nextSeq}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <TagDeleteDialog
        tag={deletingTag}
        isDeleting={isDeleting}
        onClose={() => setDeletingTag(null)}
        onConfirm={handleDeleteTag}
      />
    </div>
  );
}
