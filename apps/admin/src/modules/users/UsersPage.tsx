import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import {
  Badge,
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
import { UserListToolbar } from "./components/UserListToolbar";
import { UserMobileList } from "./components/UserMobileList";
import { useAdminUserList } from "./hooks/use-admin-user-list";
import type { UserRow } from "./model";

export function UsersPage() {
  const {
    rows,
    visibleRows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    search,
    setSearch,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  } = useAdminUserList();
  const isMdScreen = useIsMdScreen();
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const handleToggleVip = useCallback(
    async (user: UserRow) => {
      setTogglingUserId(user.id);
      try {
        if (user.isVip) {
          await apiClient.users.revokeVipRole(Number(user.id));
          addToast("已取消 VIP", "success");
        } else {
          await apiClient.users.grantVipRole(Number(user.id));
          addToast("已授予 VIP", "success");
        }
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "操作失败，请稍后重试", "error");
        throw err;
      } finally {
        setTogglingUserId(null);
      }
    },
    [refetch],
  );

  const columns = useMemo<Array<DataTableColumn<UserRow>>>(
    () => [
      {
        id: "user",
        header: "用户",
        isRowHeader: true,
        width: "32%",
        minWidth: 200,
        className: "min-w-0 whitespace-normal",
        cell: (user) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
            <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <span>#{user.id}</span>
              {user.mark ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{user.mark}</span>
                </>
              ) : null}
            </p>
          </div>
        ),
      },
      {
        id: "roles",
        header: "角色",
        width: "22%",
        minWidth: 160,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (user) => (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {user.isAdmin ? <Badge variant="brand">管理员</Badge> : null}
            {user.isVip ? <Badge variant="success">VIP</Badge> : null}
            {!user.isAdmin && !user.isVip ? <Badge variant="secondary">普通用户</Badge> : null}
          </div>
        ),
      },
      {
        id: "status",
        header: "状态",
        width: "14%",
        minWidth: 96,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (user) => (
          <Badge variant={user.isOnline ? "success" : "secondary"}>
            {user.isOnline ? "在线" : "离线"}
          </Badge>
        ),
      },
      {
        id: "lastActiveAt",
        header: "最近活跃",
        width: "18%",
        minWidth: 132,
        className: "text-muted-foreground tabular-nums",
        cell: (user) => user.lastActiveAt,
      },
      {
        id: "actions",
        header: "操作",
        width: "14%",
        minWidth: 116,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (user) => (
          <Button
            type="button"
            size="sm"
            variant={user.isVip ? "outline" : "default"}
            className="h-7 px-2 text-xs"
            isLoading={togglingUserId === user.id}
            onPress={() => void handleToggleVip(user).catch(() => undefined)}
          >
            {user.isVip ? "取消 VIP" : "授予 VIP"}
          </Button>
        ),
      },
    ],
    [handleToggleVip, togglingUserId],
  );

  const emptyState: DataTableEmptyState = search.trim()
    ? {
        icon: "search",
        title: "未找到匹配的用户",
        description: "调整搜索条件后再试。",
      }
    : {
        icon: "user",
        title: "还没有用户",
        description: "注册用户出现后会在这里展示。",
      };

  const total = pageData?.total ?? 0;
  const totalPages = pageData?.pages ?? 0;
  const showPagination = totalPages > 1;
  const showSummary = !isLoading && total > 0;

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="用户管理"
        description="查看注册用户状态，并管理 VIP 权限。"
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

      <section className="flex min-h-0 min-w-0 max-w-full flex-col" aria-label="用户列表">
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <AdminListCard className="md:min-h-[360px]">
          <UserListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            canClear={hasActiveListQuery}
            onClear={resetListQuery}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="用户列表"
                items={visibleRows}
                columns={columns}
                getRowId={(user) => user.id}
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
                <UserMobileList
                  items={visibleRows}
                  isLoading={isLoading}
                  emptyState={emptyState}
                  togglingUserId={togglingUserId}
                  onToggleVip={(user) => void handleToggleVip(user).catch(() => undefined)}
                />
              </div>
            )}
          </div>

          {showSummary || showPagination ? (
            <div className="shrink-0 px-4 py-3">
              {showSummary ? (
                <AdminListSummary
                  visibleCount={rows.length}
                  secondary={`总计 ${total.toLocaleString()} 位`}
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
    </div>
  );
}
