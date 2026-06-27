import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import {
  Button,
  DataTable,
  Pagination,
  type DataTableColumn,
  type DataTableEmptyState,
} from "@repo/ui";
import { AdminListCard } from "../../components/AdminListCard";
import { AdminListSummary } from "../../components/AdminListSummary";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { apiClient } from "../../lib/api";
import { adminFlushDataTableClassNames } from "../../lib/data-table-flush";
import { addToast } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { GuestbookDeleteDialog } from "./components/GuestbookDeleteDialog";
import { GuestbookListToolbar } from "./components/GuestbookListToolbar";
import { GuestbookMobileList } from "./components/GuestbookMobileList";
import { useAdminGuestbookList } from "./hooks/use-admin-guestbook-list";
import type { GuestbookRow } from "./model";

export function GuestbookPage() {
  const {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setSearch,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  } = useAdminGuestbookList();
  const isMdScreen = useIsMdScreen();
  const [deletingMessage, setDeletingMessage] = useState<GuestbookRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteMessage = useCallback(
    async (message: GuestbookRow) => {
      setIsDeleting(true);
      try {
        await apiClient.guestbook.delete(Number(message.id));
        addToast("留言已删除", "success");
        setDeletingMessage(null);
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

  const columns = useMemo<Array<DataTableColumn<GuestbookRow>>>(
    () => [
      {
        id: "content",
        header: "留言内容",
        isRowHeader: true,
        width: "44%",
        minWidth: 240,
        className: "min-w-0 whitespace-normal",
        cell: (message) => (
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm leading-6 text-foreground">{message.content}</p>
            <p className="mt-1 text-xs text-muted-foreground">给用户 #{message.ownerUserId}</p>
          </div>
        ),
      },
      {
        id: "author",
        header: "留言者",
        width: "16%",
        minWidth: 120,
        className: "truncate text-muted-foreground",
        cell: (message) => message.authorName,
      },
      {
        id: "stats",
        header: "互动",
        width: "16%",
        minWidth: 112,
        className: "text-muted-foreground",
        cell: (message) => `${message.replyCount} 回复 · ${message.likeCount} 赞`,
      },
      {
        id: "createdAt",
        header: "时间",
        width: "16%",
        minWidth: 128,
        className: "text-muted-foreground tabular-nums",
        cell: (message) => message.createdAt,
      },
      {
        id: "actions",
        header: "操作",
        width: "8%",
        minWidth: 88,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (message) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onPress={() => setDeletingMessage(message)}
          >
            删除
          </Button>
        ),
      },
    ],
    [],
  );

  const emptyState: DataTableEmptyState = filters.search.trim()
    ? {
        icon: "search",
        title: "未找到匹配的留言",
        description: "调整搜索条件后再试。",
      }
    : {
        icon: "message-circle-line",
        title: "还没有留言",
        description: "用户在留言板发布内容后会出现在这里。",
      };

  const total = pageData?.total ?? 0;
  const totalPages = pageData?.pages ?? 0;
  const showPagination = totalPages > 1;
  const showSummary = !isLoading && total > 0;

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="留言管理"
        description="管理留言板内容，查看互动并清理异常留言。"
        action={
          <Button
            size="sm"
            variant="outline"
            className="w-full shrink-0 sm:w-auto"
            onPress={() => void refetch()}
          >
            <SvgIcon name="refresh-cw" size={15} />
            刷新
          </Button>
        }
      />

      <section className="flex min-h-0 min-w-0 max-w-full flex-col" aria-label="留言列表">
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <AdminListCard className="md:min-h-[360px]">
          <GuestbookListToolbar
            searchValue={filters.search}
            onSearchChange={setSearch}
            canClear={hasActiveListQuery}
            onClear={resetListQuery}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="留言列表"
                items={rows}
                columns={columns}
                getRowId={(message) => message.id}
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
                <GuestbookMobileList
                  items={rows}
                  isLoading={isLoading}
                  emptyState={emptyState}
                  onDelete={setDeletingMessage}
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

      <GuestbookDeleteDialog
        message={deletingMessage}
        isDeleting={isDeleting}
        onClose={() => setDeletingMessage(null)}
        onConfirm={handleDeleteMessage}
      />
    </div>
  );
}
