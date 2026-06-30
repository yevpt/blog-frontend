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
    resetListQuery,
    hasActiveListQuery,
    refetch,
  } = useAdminMomentList();
  const isMdScreen = useIsMdScreen();
  const [deletingMomentId, setDeletingMomentId] = useState<string | null>(null);
  const [editingMoment, setEditingMoment] = useState<MomentRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
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
        addToast(mode === "create" ? "碎语已创建" : "碎语已保存", "success");
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
      setDeletingMomentId(moment.id);
      try {
        await apiClient.moments.delete(Number(moment.id));
        addToast("碎语已删除", "success");
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "删除失败，请稍后重试", "error");
        throw err;
      } finally {
        setDeletingMomentId(null);
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
          addToast("碎语已置顶", "success");
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
        deletingMomentId,
        onToggleTop: (moment) => void handleToggleTop(moment).catch(() => undefined),
        onEdit: openEditDialog,
        onConfirmDelete: handleDeleteMoment,
      }),
    [deletingMomentId, handleDeleteMoment, handleToggleTop, openEditDialog, togglingTopId],
  );

  const hasActiveFilter = filters.status !== "all" || filters.search.trim().length > 0;
  const emptyState: DataTableEmptyState = hasActiveFilter
    ? {
        icon: "search",
        title: "未找到匹配的碎语",
        description: "调整搜索或筛选条件后再试。",
      }
    : {
        icon: "message-circle",
        title: "还没有碎语",
        description: "用户发布碎语后会出现在这里。",
      };

  const total = pageData?.total ?? 0;
  const totalPages = pageData?.pages ?? 0;
  const showPagination = totalPages > 1;
  const showSummary = !isLoading && total > 0;

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="碎语管理"
        description="管理全站碎语内容、公开状态与置顶顺序。"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="sm" className="w-full shrink-0 sm:w-auto" onPress={openCreateDialog}>
              <SvgIcon name="plus" size={15} />
              新建碎语
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

      <section className="flex min-h-0 min-w-0 max-w-full flex-col" aria-label="碎语列表">
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
            canClear={hasActiveListQuery}
            onClear={resetListQuery}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="碎语列表"
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
                  deletingMomentId={deletingMomentId}
                  onConfirmDelete={handleDeleteMoment}
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
