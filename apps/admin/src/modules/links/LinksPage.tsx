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
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { FriendLinkDeleteDialog } from "./components/FriendLinkDeleteDialog";
import { FriendLinkFormDialog } from "./components/FriendLinkFormDialog";
import { FriendLinkListToolbar } from "./components/FriendLinkListToolbar";
import { FriendLinkMobileList } from "./components/FriendLinkMobileList";
import { FriendLinkNameCell } from "./components/FriendLinkNameCell";
import { FriendLinkStatusBadge } from "./components/FriendLinkStatusBadge";
import { useFriendLinkList } from "./hooks/use-friend-link-list";
import {
  countFriendLinksByStatus,
  filterAndSortFriendLinkRows,
  matchFriendLinkSearch,
  suggestNextSeq,
  toFriendLinkCreateReq,
  toFriendLinkUpdateReq,
  type FriendLinkFormValues,
  type FriendLinkLogoValue,
  type FriendLinkRow,
} from "./model";

type FormMode = "create" | "edit";

export function LinksPage() {
  const { rows, items, isLoading, error, refetch } = useFriendLinkList();
  const isMdScreen = useIsMdScreen();
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<FriendLinkRow | null>(null);
  const [deletingLink, setDeletingLink] = useState<FriendLinkRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableState, setTableState] = useState<DataTableState>({
    searchValue: "",
    filters: { status: "all" },
    sort: { column: "seq", direction: "ascending" },
  });

  const nextSeq = useMemo(() => suggestNextSeq(items), [items]);
  const statusCounts = useMemo(() => countFriendLinksByStatus(rows), [rows]);
  const visibleRows = useMemo(
    () => filterAndSortFriendLinkRows(rows, tableState),
    [rows, tableState],
  );
  const statusFilter = String(tableState.filters.status ?? "all");

  const openCreateDialog = useCallback(() => {
    setFormMode("create");
    setEditingLink(null);
    setFormOpen(true);
  }, []);

  const openEditDialog = useCallback((link: FriendLinkRow) => {
    setFormMode("edit");
    setEditingLink(link);
    setFormOpen(true);
  }, []);

  const handleSearchChange = useCallback((searchValue: string) => {
    setTableState((current) => ({ ...current, searchValue }));
  }, []);

  const handleStatusFilterChange = useCallback((status: string) => {
    setTableState((current) => ({
      ...current,
      filters: { ...current.filters, status },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (
      values: FriendLinkFormValues,
      logo: FriendLinkLogoValue | null,
      mode: FormMode,
      linkId?: string,
    ) => {
      setIsSubmitting(true);
      try {
        if (mode === "create") {
          if (!logo) {
            throw new Error("请上传友链 Logo");
          }
          await apiClient.friendLinks.create(toFriendLinkCreateReq(values, logo));
          addToast("友链已创建", "success");
        } else if (linkId) {
          await apiClient.friendLinks.update(Number(linkId), toFriendLinkUpdateReq(values, logo));
          addToast("友链已更新", "success");
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

  const handleDeleteLink = useCallback(
    async (linkId: string) => {
      setIsDeleting(true);
      try {
        await apiClient.friendLinks.delete(Number(linkId));
        addToast("友链已删除", "success");
        setDeletingLink(null);
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

  const columns = useMemo<Array<DataTableColumn<FriendLinkRow>>>(
    () => [
      {
        id: "seq",
        header: "排序",
        width: "10%",
        minWidth: 72,
        className: "text-center text-muted-foreground tabular-nums",
        headerClassName:
          "text-center [&>div]:justify-center [&>div]:flex-nowrap [&>div>span]:whitespace-nowrap",
        sort: {
          defaultDirection: "ascending",
          value: (link) => link.seq,
        },
        cell: (link) => link.seq,
      },
      {
        id: "name",
        header: "友链",
        width: "28%",
        minWidth: 180,
        className: "min-w-0 whitespace-normal",
        sort: {
          value: (link) => link.name,
        },
        cell: (link) => <FriendLinkNameCell link={link} />,
      },
      {
        id: "site",
        header: "站点",
        width: "22%",
        minWidth: 140,
        className: "truncate text-muted-foreground",
        cell: (link) => (
          <a
            href={link.site}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:text-foreground hover:underline"
          >
            {link.site}
          </a>
        ),
      },
      {
        id: "status",
        header: "状态",
        width: "12%",
        minWidth: 88,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (link) => <FriendLinkStatusBadge status={link.status} />,
      },
      {
        id: "updatedAt",
        header: "更新",
        width: "12%",
        minWidth: 96,
        className: "text-muted-foreground tabular-nums",
        sort: {
          value: (link) => link.updatedAt,
        },
        cell: (link) => link.updatedAt,
      },
      {
        id: "actions",
        header: "操作",
        width: "16%",
        minWidth: 112,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (link) => (
          <div className="flex items-center justify-center gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onPress={() => openEditDialog(link)}
            >
              编辑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onPress={() => setDeletingLink(link)}
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
  const hasActiveStatusFilter = statusFilter !== "all";
  const emptyState: DataTableEmptyState =
    hasActiveSearch || hasActiveStatusFilter
      ? {
          icon: "search",
          title: "未找到匹配的友链",
          description: "调整搜索或筛选条件后再试。",
        }
      : {
          icon: "link",
          title: "还没有友链",
          description: "创建第一条友链后，它将出现在前台友情链接页。",
          action: (
            <Button size="sm" onPress={openCreateDialog}>
              <SvgIcon name="plus" size={15} />
              新建友链
            </Button>
          ),
        };

  const showSummary = !isLoading && rows.length > 0;

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="友链管理"
        description="管理友情链接、展示状态与排序，同步前台友链页。"
        action={
          <Button size="sm" className="w-full shrink-0 sm:w-auto" onPress={openCreateDialog}>
            <SvgIcon name="plus" size={15} />
            新建友链
          </Button>
        }
      />

      <section className="flex min-h-0 min-w-0 max-w-full flex-col" aria-label="友链列表">
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <AdminListCard className="md:min-h-[320px]">
          <FriendLinkListToolbar
            searchValue={tableState.searchValue}
            statusFilter={statusFilter}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="友链列表"
                items={visibleRows}
                columns={columns}
                getRowId={(link) => link.id}
                state={tableState}
                onStateChange={setTableState}
                search={{
                  placeholder: "搜索名称、站点或描述…",
                  match: matchFriendLinkSearch,
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
                <FriendLinkMobileList
                  items={visibleRows}
                  isLoading={isLoading}
                  emptyState={emptyState}
                  onEdit={openEditDialog}
                  onDelete={setDeletingLink}
                />
              </div>
            )}
          </div>

          {showSummary ? (
            <AdminListSummary
              visibleCount={visibleRows.length}
              secondary={`显示 ${statusCounts.visible} · 隐藏 ${statusCounts.hidden} · 失联 ${statusCounts.disconnected}`}
            />
          ) : null}
        </AdminListCard>
      </section>

      <FriendLinkFormDialog
        mode={formMode}
        open={formOpen}
        link={editingLink}
        nextSeq={nextSeq}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <FriendLinkDeleteDialog
        link={deletingLink}
        isDeleting={isDeleting}
        onClose={() => setDeletingLink(null)}
        onConfirm={handleDeleteLink}
      />
    </div>
  );
}
