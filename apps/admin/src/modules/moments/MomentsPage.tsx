import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, DataTable, Pagination, type DataTableEmptyState } from "@repo/ui";
import { AdminListCard } from "../../components/AdminListCard";
import { AdminListSummary } from "../../components/AdminListSummary";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { apiClient } from "../../lib/api";
import { adminFlushDataTableClassNames } from "../../lib/data-table-flush";
import { addToast } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { MomentDeleteDialog } from "./components/MomentDeleteDialog";
import { MomentFormDialog } from "./components/MomentFormDialog";
import { MomentListToolbar } from "./components/MomentListToolbar";
import { MomentMobileList } from "./components/MomentMobileList";
import { createMomentColumns } from "./components/moment-columns";
import { useAdminMomentList } from "./hooks/use-admin-moment-list";
import { toMomentSaveReq, type MomentFormValues, type MomentRow } from "./model";

export function MomentsPage() {
  const {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setSearch,
    setStatus,
    refetch,
  } = useAdminMomentList();
  const isMdScreen = useIsMdScreen();
  const [deletingMoment, setDeletingMoment] = useState<MomentRow | null>(null);
  const [editingMoment, setEditingMoment] = useState<MomentRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingTopId, setTogglingTopId] = useState<string | null>(null);

  const openCreateDialog = useCallback(() => {
    setFormMode("create");
    setEditingMoment(null);
    setIsFormOpen(true);
  }, []);

  const openEditDialog = useCallback((moment: MomentRow) => {
    setFormMode("edit");
    setEditingMoment(moment);
    setIsFormOpen(true);
  }, []);

  const closeFormDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setEditingMoment(null);
  }, [isSubmitting]);

  const handleSubmitMoment = useCallback(
    async (values: MomentFormValues, mode: "create" | "edit", moment: MomentRow | null) => {
      setIsSubmitting(true);
      try {
        await apiClient.moments.save(toMomentSaveReq(values, moment));
        addToast(mode === "create" ? "动态已创建" : "动态已保存", "success");
        setIsFormOpen(false);
        setEditingMoment(null);
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "保存失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refetch],
  );

  const handleDeleteMoment = useCallback(
    async (moment: MomentRow) => {
      setIsDeleting(true);
      try {
        await apiClient.moments.delete(Number(moment.id));
        addToast("动态已删除", "success");
        setDeletingMoment(null);
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

  const handleToggleTop = useCallback(
    async (moment: MomentRow) => {
      setTogglingTopId(moment.id);
      try {
        if (moment.isTop) {
          await apiClient.moments.removeTop(Number(moment.id));
          addToast("已取消置顶", "success");
        } else {
          await apiClient.moments.setTop(Number(moment.id));
          addToast("动态已置顶", "success");
        }
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "操作失败，请稍后重试", "error");
        throw err;
      } finally {
        setTogglingTopId(null);
      }
    },
    [refetch],
  );

  const columns = useMemo(
    () =>
      createMomentColumns({
        togglingTopId,
        onToggleTop: (moment) => void handleToggleTop(moment).catch(() => undefined),
        onEdit: openEditDialog,
        onDelete: setDeletingMoment,
      }),
    [handleToggleTop, openEditDialog, togglingTopId],
  );

  const hasActiveFilter = filters.status !== "all" || filters.search.trim().length > 0;
  const emptyState: DataTableEmptyState = hasActiveFilter
    ? {
        icon: "search",
        title: "未找到匹配的动态",
        description: "调整搜索或筛选条件后再试。",
      }
    : {
        icon: "message-circle",
        title: "还没有动态",
        description: "用户发布动态后会出现在这里。",
      };

  const total = pageData?.total ?? 0;
  const totalPages = pageData?.pages ?? 0;
  const showPagination = totalPages > 1;
  const showSummary = !isLoading && total > 0;

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="动态管理"
        description="管理全站动态内容、公开状态与置顶顺序。"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="sm" className="w-full shrink-0 sm:w-auto" onPress={openCreateDialog}>
              <SvgIcon name="plus" size={15} />
              新建动态
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onPress={() => void refetch()}
            >
              <SvgIcon name="refresh-cw" size={15} />
              刷新
            </Button>
          </div>
        }
      />

      <section className="flex min-h-0 min-w-0 max-w-full flex-col" aria-label="动态列表">
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <AdminListCard className="md:min-h-[360px]">
          <MomentListToolbar
            searchValue={filters.search}
            status={filters.status}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="动态列表"
                items={rows}
                columns={columns}
                getRowId={(moment) => moment.id}
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
                <MomentMobileList
                  items={rows}
                  isLoading={isLoading}
                  emptyState={emptyState}
                  onToggleTop={(moment) => void handleToggleTop(moment).catch(() => undefined)}
                  onEdit={openEditDialog}
                  onDelete={setDeletingMoment}
                />
              </div>
            )}
          </div>

          {showSummary || showPagination ? (
            <div className="shrink-0 px-4 py-3">
              {showSummary ? (
                <AdminListSummary
                  visibleCount={rows.length}
                  secondary={`总计 ${total.toLocaleString()} 条`}
                  className="px-0 pt-0"
                />
              ) : null}
              {showPagination ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className="pt-3 md:pt-3"
                />
              ) : null}
            </div>
          ) : null}
        </AdminListCard>
      </section>

      <MomentDeleteDialog
        moment={deletingMoment}
        isDeleting={isDeleting}
        onClose={() => setDeletingMoment(null)}
        onConfirm={handleDeleteMoment}
      />
      <MomentFormDialog
        mode={formMode}
        open={isFormOpen}
        moment={editingMoment}
        isSubmitting={isSubmitting}
        onClose={closeFormDialog}
        onSubmit={handleSubmitMoment}
      />
    </div>
  );
}
