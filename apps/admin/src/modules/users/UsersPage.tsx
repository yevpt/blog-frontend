import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { AdminRowAction, AdminRowActions } from "../../components/AdminRowAction";
import { adminFlushDataTableClassNames } from "../../lib/data-table-flush";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { UserListToolbar } from "./components/UserListToolbar";
import { UserDetailModal } from "./components/UserDetailModal";
import { UserMobileList } from "./components/UserMobileList";
import { useAdminUserList } from "./hooks/use-admin-user-list";
import { getAccountStatusBadge, getSanctionBadge, type UserRow } from "./model";

export function UsersPage() {
  const {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setFilters,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  } = useAdminUserList();
  const isMdScreen = useIsMdScreen();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleViewDetail = useCallback((user: UserRow) => {
    setSelectedUserId(user.id);
  }, []);

  const columns = useMemo<Array<DataTableColumn<UserRow>>>(
    () => [
      {
        id: "user",
        header: "用户",
        isRowHeader: true,
        width: "24%",
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
        width: "16%",
        minWidth: 128,
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
        id: "accountStatus",
        header: "账号",
        width: "12%",
        minWidth: 88,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (user) => {
          const badge = getAccountStatusBadge(user);
          return <Badge variant={badge.variant}>{badge.label}</Badge>;
        },
      },
      {
        id: "sanctionState",
        header: "内容",
        width: "12%",
        minWidth: 88,
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (user) => {
          const badge = getSanctionBadge(user);
          return <Badge variant={badge.variant}>{badge.label}</Badge>;
        },
      },
      {
        id: "lastActiveAt",
        header: "最近活跃",
        width: "20%",
        minWidth: 132,
        className: "text-muted-foreground tabular-nums",
        cell: (user) => user.lastActiveAt,
      },
      {
        id: "actions",
        header: "操作",
        width: "16%",
        minWidth: 96,
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
        cell: (user) => (
          <AdminRowActions>
            <AdminRowAction type="button" onPress={() => handleViewDetail(user)}>
              查看详情
            </AdminRowAction>
          </AdminRowActions>
        ),
      },
    ],
    [handleViewDetail],
  );

  const emptyState: DataTableEmptyState = filters.keyword.trim()
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
    <div className="flex min-w-0 max-w-full flex-col gap-4 md:min-h-0 md:h-[calc(100dvh-3rem)] md:overflow-y-auto lg:h-[calc(100dvh-3.5rem)]">
      <AdminPageHeader
        title="用户管理"
        description="查看注册用户状态、角色权限与内容治理情况。"
        action={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              size="sm"
              variant="ghost"
              className="w-full shrink-0 sm:w-auto"
              onPress={() => navigate("/users/tools")}
            >
              <SvgIcon name="image" size={15} />
              工具
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

      <section
        className="flex min-h-[360px] min-w-0 shrink-0 flex-col md:min-h-[min(360px,40vh)]"
        aria-label="用户列表"
      >
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        <AdminListCard className="flex min-h-[360px] flex-1 flex-col">
          <UserListToolbar
            filters={filters}
            onFiltersChange={setFilters}
            canClear={hasActiveListQuery}
            onClear={resetListQuery}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            {isMdScreen ? (
              <DataTable
                aria-label="用户列表"
                items={rows}
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
                  items={rows}
                  isLoading={isLoading}
                  emptyState={emptyState}
                  onViewDetail={handleViewDetail}
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
      <UserDetailModal
        userId={selectedUserId ? Number(selectedUserId) : null}
        onClose={() => setSelectedUserId(null)}
        onChanged={() => void refetch()}
      />
    </div>
  );
}
